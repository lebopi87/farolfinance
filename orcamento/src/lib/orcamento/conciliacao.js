// Pareamento entre compras da fatura (transacoes_cartao) e lançamentos.

import { diferencaDias } from './datas.js';
import { centavos } from './calculo.js';

const JANELA_DIAS = 3;
const IGNORAR_TIPOS = ['estorno', 'pagamento'];

function valorBate(t, l) {
  const vt = centavos(t.valor_brl);
  if (centavos(l.valor) === vt) return true;
  // Parcela 1/N na fatura × lançamento com o valor cheio da compra.
  const n = Number(l.total_parcelas ?? 1);
  if (n > 1 && Number(t.total_parcelas ?? 0) === n) {
    return Math.abs(centavos(Number(l.valor) / n) - vt) <= n;
  }
  return false;
}

/**
 * Sugere o par de cada compra da fatura: mesmo valor, data ±3 dias, lançamento
 * ainda não vinculado. Cada lançamento entra em no máximo um par, preferindo a
 * data mais próxima.
 *
 * Status de cada transação:
 * - vinculado: já tem lançamento com transacao_cartao_id
 * - sugerido: par encontrado, aguardando confirmação
 * - nao_lancada: compra sem lançamento
 * - provisao: parcela 2/N em diante (coberta pela provisão do cartão)
 * - fixo: ligada a um gasto fixo
 * - ignorada: estorno ou pagamento
 */
export function sugerirConciliacao(transacoes, lancamentos) {
  const vinculadas = new Map(
    lancamentos.filter((l) => l.transacao_cartao_id).map((l) => [l.transacao_cartao_id, l]),
  );
  const livres = lancamentos.filter((l) => !l.transacao_cartao_id);

  const resultado = new Map();
  const pendentes = [];
  for (const t of transacoes) {
    if (vinculadas.has(t.id)) resultado.set(t.id, { transacao: t, status: 'vinculado', lancamento: vinculadas.get(t.id) });
    else if (IGNORAR_TIPOS.includes(t.tipo)) resultado.set(t.id, { transacao: t, status: 'ignorada' });
    else if (Number(t.parcela_atual ?? 1) >= 2) resultado.set(t.id, { transacao: t, status: 'provisao' });
    else if (t.gasto_fixo_id) resultado.set(t.id, { transacao: t, status: 'fixo' });
    else pendentes.push(t);
  }

  const candidatos = [];
  for (const t of pendentes) {
    for (const l of livres) {
      const dist = Math.abs(diferencaDias(t.data_compra, l.data));
      if (dist <= JANELA_DIAS && valorBate(t, l)) candidatos.push({ t, l, dist });
    }
  }
  candidatos.sort((a, b) => a.dist - b.dist || String(a.t.data_compra).localeCompare(b.t.data_compra));

  const usados = new Set();
  for (const { t, l, dist } of candidatos) {
    if (resultado.has(t.id) || usados.has(l.id)) continue;
    usados.add(l.id);
    resultado.set(t.id, { transacao: t, status: 'sugerido', lancamento: l, diferencaDias: dist });
  }
  for (const t of pendentes) {
    if (!resultado.has(t.id)) resultado.set(t.id, { transacao: t, status: 'nao_lancada' });
  }

  return transacoes.map((t) => resultado.get(t.id));
}
