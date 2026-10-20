// Leitura e gravação no Supabase. Toda a lógica de cálculo fica em ./orcamento.

import { sb } from './supabase.js';
import { diasNoMes, formatarISO, parametrosDoMesAnterior, resolverParametrosMes } from './orcamento/index.js';

const ok = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

export async function carregarCategorias() {
  return ok(await sb.from('categorias').select('id,nome,icone,cor').order('nome'));
}

export async function carregarLancamentosDoMes(ano, mes) {
  return ok(
    await sb
      .from('lancamentos')
      .select('*')
      .gte('data', formatarISO(ano, mes, 1))
      .lte('data', formatarISO(ano, mes, diasNoMes(ano, mes)))
      .order('data', { ascending: false })
      .order('created_at', { ascending: false }),
  );
}

/**
 * Parâmetros do mês. Se o mês ainda não tiver metas ou orcamento_mes, grava
 * as herdadas (mês anterior → metas_categoria) para ele passar a ter as suas.
 */
async function carregarFontesParametros() {
  const [metasMensais, orcamentos, metasCategoria] = await Promise.all([
    sb.from('metas_mensais').select('categoria_id,mes,ano,valor').then(ok),
    sb.from('orcamento_mes').select('*').then(ok),
    sb.from('metas_categoria').select('categoria,meta_mensal,ativo').then(ok),
  ]);
  return { metasMensais, orcamentos, metasCategoria };
}

export async function garantirParametrosMes(ano, mes, categorias) {
  const fontes = await carregarFontesParametros();
  const p = resolverParametrosMes({ ano, mes, categorias, ...fontes });

  if (p.aGravar.metasMensais.length) {
    ok(
      await sb
        .from('metas_mensais')
        .upsert(p.aGravar.metasMensais, { onConflict: 'categoria_id,mes,ano', ignoreDuplicates: true }),
    );
  }
  if (p.aGravar.orcamentoMes) {
    ok(await sb.from('orcamento_mes').upsert(p.aGravar.orcamentoMes, { onConflict: 'mes,ano', ignoreDuplicates: true }));
  }
  return p;
}

/** Valores do mês anterior, para o botão "copiar do mês anterior" (não grava). */
export async function carregarParametrosDoMesAnterior(ano, mes, categorias) {
  return parametrosDoMesAnterior({ ano, mes, categorias, ...(await carregarFontesParametros()) });
}

/** Grava metas, meta de economia, provisão extra e observação do mês (sobrescreve). */
export async function salvarParametrosMes(ano, mes, { metas, metaEconomia, provisaoExtra, observacao }) {
  const agora = new Date().toISOString();
  const linhas = Object.entries(metas).map(([categoria_id, valor]) => ({ categoria_id, mes, ano, valor, updated_at: agora }));
  ok(await sb.from('metas_mensais').upsert(linhas, { onConflict: 'categoria_id,mes,ano' }));
  ok(
    await sb.from('orcamento_mes').upsert(
      { mes, ano, meta_economia: metaEconomia, provisao_extra: provisaoExtra, observacao: observacao || null, updated_at: agora },
      { onConflict: 'mes,ano' },
    ),
  );
}

export async function inserirLancamento(l) {
  return ok(await sb.from('lancamentos').insert(l).select().single());
}

export async function atualizarLancamento(id, campos) {
  return ok(
    await sb.from('lancamentos').update({ ...campos, updated_at: new Date().toISOString() }).eq('id', id).select().single(),
  );
}

export async function excluirLancamento(id) {
  ok(await sb.from('lancamentos').delete().eq('id', id));
}

/** Fixos, lançamentos de fixos e receitas: base do fechamento (tabelas pequenas, carrega tudo). */
export async function carregarBaseFechamento() {
  const [gastosFixos, lancamentosFixos, receitas] = await Promise.all([
    sb.from('gastos_fixos').select('*').then(ok),
    sb.from('lancamentos_fixos').select('*').then(ok),
    sb.from('receitas').select('*').then(ok),
  ]);
  return { gastosFixos, lancamentosFixos, receitas };
}

/** Compras parceladas feitas antes do mês: as únicas que podem ter parcela cobrada nele. */
export async function carregarParceladosAntes(ano, mes) {
  return ok(
    await sb
      .from('lancamentos')
      .select('*, categorias(nome,icone)')
      .gt('total_parcelas', 1)
      .lt('data', formatarISO(ano, mes, 1))
      .order('data', { ascending: false }),
  );
}
