// Parâmetros do mês (metas por categoria, meta de economia, provisão extra)
// e a herança para meses que ainda não têm parâmetros.

import { indiceMes, somarMeses } from './datas.js';

const maisRecenteAntes = (linhas, ano, mes) => {
  const alvo = indiceMes(ano, mes);
  let melhor = null;
  for (const l of linhas) {
    const i = indiceMes(l.ano, l.mes);
    if (i < alvo && (!melhor || i > indiceMes(melhor.ano, melhor.mes))) melhor = l;
  }
  return melhor;
};

/**
 * Resolve os parâmetros do mês. Cada meta de categoria vem, em ordem:
 * do próprio mês → do mês anterior mais recente que tiver → de metas_categoria (pelo nome) → 0.
 * A meta de economia segue a mesma ordem (sem metas_categoria). A provisão extra
 * é do próprio mês e não é herdada.
 *
 * `aGravar` traz as linhas a inserir para o mês passar a ter parâmetros próprios.
 */
export function resolverParametrosMes({ ano, mes, categorias, metasMensais, orcamentos, metasCategoria }) {
  const metas = {};
  const origem = {};
  const metasAGravar = [];

  for (const c of categorias) {
    const daCategoria = metasMensais.filter((m) => m.categoria_id === c.id);
    const propria = daCategoria.find((m) => m.ano === ano && m.mes === mes);
    if (propria) {
      metas[c.id] = Number(propria.valor);
      origem[c.id] = 'proprio';
      continue;
    }
    const anterior = maisRecenteAntes(daCategoria, ano, mes);
    const padrao = (metasCategoria ?? []).find((m) => m.categoria === c.nome && m.ativo !== false);
    if (anterior) {
      metas[c.id] = Number(anterior.valor);
      origem[c.id] = 'anterior';
    } else if (padrao) {
      metas[c.id] = Number(padrao.meta_mensal);
      origem[c.id] = 'padrao';
    } else {
      metas[c.id] = 0;
      origem[c.id] = 'vazio';
    }
    metasAGravar.push({ categoria_id: c.id, mes, ano, valor: metas[c.id] });
  }

  const orcProprio = orcamentos.find((o) => o.ano === ano && o.mes === mes);
  const orcAnterior = orcProprio ? null : maisRecenteAntes(orcamentos, ano, mes);
  const metaEconomia = Number((orcProprio ?? orcAnterior)?.meta_economia ?? 0);
  const provisaoExtra = Number(orcProprio?.provisao_extra ?? 0);

  return {
    metas,
    origem,
    metaEconomia,
    provisaoExtra,
    observacao: orcProprio?.observacao ?? null,
    temProprios: metasAGravar.length === 0 && !!orcProprio,
    aGravar: {
      metasMensais: metasAGravar,
      orcamentoMes: orcProprio ? null : { mes, ano, meta_economia: metaEconomia, provisao_extra: 0 },
    },
  };
}

/** Valores do mês imediatamente anterior, para o botão "copiar do mês anterior". */
export function parametrosDoMesAnterior({ ano, mes, ...resto }) {
  const ant = somarMeses(ano, mes, -1);
  const r = resolverParametrosMes({ ...ant, ...resto });
  return { metas: r.metas, metaEconomia: r.metaEconomia };
}
