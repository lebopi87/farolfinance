// Provisão do cartão, fixos, renda e fechamento do mês.

import { indiceMes, parseData } from './datas.js';
import { centavos, reais, doMes } from './calculo.js';

/**
 * Provisão do cartão do mês M: Σ (valor / total_parcelas) dos parcelados cuja
 * janela de cobrança contém M, + provisao_extra. A janela começa no mês
 * seguinte ao da compra e dura total_parcelas meses.
 */
export function provisaoCartao(lancamentos, ano, mes, provisaoExtra = 0) {
  const alvo = indiceMes(ano, mes);
  const parcelas = [];
  for (const l of lancamentos) {
    const n = Number(l.total_parcelas ?? 1);
    if (n <= 1) continue;
    const d = parseData(l.data);
    const numero = alvo - indiceMes(d.ano, d.mes);
    if (numero >= 1 && numero <= n) {
      parcelas.push({ lancamento: l, numero, de: n, valor: Number(l.valor) / n });
    }
  }
  const somaParcelas = parcelas.reduce((s, p) => s + p.valor, 0);
  const extra = Number(provisaoExtra ?? 0);
  return { parcelas, somaParcelas, extra, total: somaParcelas + extra };
}

const normalizar = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

// Linhas de gastos_fixos que hoje são calculadas pelo módulo (provisão e
// meta_economia). Somá-las contaria esses valores em dobro.
export function ehFixoCalculado(gasto) {
  const d = normalizar(gasto.descricao);
  return d.startsWith('provisionamento do cartao') || d === 'economia';
}

export const ehPoupanca = (gasto) => normalizar(gasto.descricao).includes('(poupanca)');

function vigenteNoMes(g, ano, mes) {
  const alvo = indiceMes(ano, mes);
  const inicio = g.ano_inicio && g.mes_inicio ? indiceMes(g.ano_inicio, g.mes_inicio) : -Infinity;
  let fim = g.ano_fim && g.mes_fim ? indiceMes(g.ano_fim, g.mes_fim) : Infinity;
  if (g.tipo === 'parcelado' && g.total_parcelas && inicio !== -Infinity) {
    fim = Math.min(fim, inicio + Number(g.total_parcelas) - 1);
  }
  if (alvo < inicio || alvo > fim) return false;
  if (g.tipo === 'anual') return g.mes_inicio ? g.mes_inicio === mes : true;
  return true;
}

/**
 * Fixos e poupanças do mês a partir de gastos_fixos. Se houver um registro
 * em lancamentos_fixos para o gasto no mês, o valor dele prevalece.
 */
export function fixosDoMes(gastosFixos, lancamentosFixos, ano, mes) {
  const lancadoNoMes = new Map(
    (lancamentosFixos ?? [])
      .filter((l) => l.ano === ano && l.mes === mes)
      .map((l) => [l.gasto_fixo_id, Number(l.valor)]),
  );
  const itens = gastosFixos
    .filter((g) => g.ativo !== false && !ehFixoCalculado(g) && vigenteNoMes(g, ano, mes))
    .map((g) => ({
      gasto: g,
      poupanca: ehPoupanca(g),
      valor: lancadoNoMes.get(g.id) ?? Number(g.valor),
    }));
  const somar = (lista) => reais(lista.reduce((s, i) => s + centavos(i.valor), 0));
  return {
    itens,
    fixos: somar(itens.filter((i) => !i.poupanca)),
    poupancas: somar(itens.filter((i) => i.poupanca)),
  };
}

/**
 * Renda do mês. Usa as receitas do próprio mês; se não houver nenhuma,
 * repete as receitas fixas do mês anterior mais recente que tiver.
 */
export function rendaDoMes(receitas, ano, mes) {
  const alvo = indiceMes(ano, mes);
  let itens = receitas.filter((r) => r.ano === ano && r.mes === mes);
  let herdadoDe = null;

  if (itens.length === 0) {
    const anteriores = receitas.filter((r) => r.tipo === 'fixo' && indiceMes(r.ano, r.mes) < alvo);
    if (anteriores.length) {
      const ultimo = Math.max(...anteriores.map((r) => indiceMes(r.ano, r.mes)));
      itens = anteriores.filter((r) => indiceMes(r.ano, r.mes) === ultimo);
      herdadoDe = { ano: itens[0].ano, mes: itens[0].mes };
    }
  }

  const porPessoa = {};
  let total = 0;
  for (const r of itens) {
    porPessoa[r.pessoa] = (porPessoa[r.pessoa] ?? 0) + centavos(r.valor);
    total += centavos(r.valor);
  }
  for (const p of Object.keys(porPessoa)) porPessoa[p] = reais(porPessoa[p]);
  return { itens, porPessoa, total: reais(total), herdadoDe };
}

/**
 * Sobra = Renda − (fixos + poupanças + provisão do cartão + meta_economia + Σ metas variáveis)
 */
export function fechamento({ renda, fixos, poupancas, provisao, metaEconomia, somaMetas }) {
  const comprometido = fixos + poupancas + provisao + Number(metaEconomia ?? 0) + somaMetas;
  return { renda, fixos, poupancas, provisao, metaEconomia: Number(metaEconomia ?? 0), somaMetas, comprometido, sobra: renda - comprometido };
}

/** Total gasto por pessoa no mês: todos os lançamentos, parcelados pelo valor cheio na data da compra. */
export function totalPorPessoa(lancamentos, ano, mes) {
  const total = {};
  for (const l of doMes(lancamentos, ano, mes)) {
    total[l.pessoa] = (total[l.pessoa] ?? 0) + centavos(l.valor);
  }
  for (const p of Object.keys(total)) total[p] = reais(total[p]);
  return total;
}
