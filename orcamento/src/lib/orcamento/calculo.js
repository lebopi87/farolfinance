// Metas semanais, diárias e "como deveria estar" por categoria.
// Reproduz a planilha "Gastos 7/4", com a correção da meta diária.

import { diasNoMes, parseData, semanasDoMes, indiceMes } from './datas.js';

export const centavos = (v) => Math.round(Number(v) * 100);
export const reais = (c) => c / 100;

export const ehAVista = (l) => Number(l.total_parcelas ?? 1) === 1;

export function doMes(lancamentos, ano, mes) {
  return lancamentos.filter((l) => {
    const d = parseData(l.data);
    return d.ano === ano && d.mes === mes;
  });
}

/**
 * Em que ponto do mês estamos, olhando para "hoje".
 * - passado: todos os dias já passaram (dia = dm)
 * - corrente: dia = dia de hoje
 * - futuro: nenhum dia passou (dia = 0)
 */
export function referenciaDoMes(ano, mes, hoje) {
  const dm = diasNoMes(ano, mes);
  const h = parseData(hoje);
  const atual = indiceMes(ano, mes);
  const deHoje = indiceMes(h.ano, h.mes);
  if (atual < deHoje) return { status: 'passado', dia: dm };
  if (atual > deHoje) return { status: 'futuro', dia: 0 };
  return { status: 'corrente', dia: h.dia };
}

/**
 * Realizado por dia, em centavos, de cada categoria no mês.
 * Só conta lançamentos à vista (total_parcelas = 1): parcelados vão para a provisão.
 * @returns {Map<string, number[]>} categoria_id → array indexado pelo dia (1..dm)
 */
export function realizadoDiario(lancamentos, ano, mes) {
  const dm = diasNoMes(ano, mes);
  const porCategoria = new Map();
  for (const l of doMes(lancamentos, ano, mes)) {
    if (!ehAVista(l)) continue;
    if (!porCategoria.has(l.categoria_id)) porCategoria.set(l.categoria_id, new Array(dm + 1).fill(0));
    porCategoria.get(l.categoria_id)[parseData(l.data).dia] += centavos(l.valor);
  }
  return porCategoria;
}

const somaDias = (diarios, de, ate) => {
  let s = 0;
  for (let d = de; d <= ate; d++) s += diarios[d] ?? 0;
  return s;
};

/** Meta da semana: MetaMês × (dias do dia 1 até o fim da semana) / dm − realizado acumulado antes dela. */
export function metaDaSemana(metaMes, dm, fimSemana, acumuladoAntesCentavos) {
  return (Number(metaMes) * fimSemana) / dm - reais(acumuladoAntesCentavos);
}

/** "Como deveria estar": MetaMês × dia de hoje / dm. */
export function comoDeveriaEstar(metaMes, diaHoje, dm) {
  return (Number(metaMes) * diaHoje) / dm;
}

/**
 * Metas diárias de uma semana.
 * - Dias até hoje: (MetaSemana − realizado da semana ANTES do dia d) / dias restantes contando d.
 *   (A planilha descontava o realizado da semana inteira; aqui é corrigido.)
 * - Dias futuros: o que sobrou da semana até hoje dividido igualmente pelos dias que faltam.
 */
function diasDaSemana(semana, metaSemana, diarios, diaRef) {
  const dias = [];
  for (let d = semana.inicio; d <= semana.fim; d++) {
    const base = d <= diaRef ? d : Math.max(semana.inicio, diaRef + 1);
    const realizadoAntes = somaDias(diarios, semana.inicio, base - 1);
    const meta = (metaSemana - reais(realizadoAntes)) / (semana.fim - base + 1);
    const realizado = reais(diarios[d] ?? 0);
    dias.push({ dia: d, meta, realizado, disponivel: meta - realizado });
  }
  return dias;
}

/**
 * Cálculo completo de uma categoria no mês.
 * @param {object} p
 * @param {number} p.ano
 * @param {number} p.mes
 * @param {number} p.metaMes
 * @param {number[]} p.diarios realizado por dia em centavos (de realizadoDiario)
 * @param {{status: string, dia: number}} p.referencia de referenciaDoMes
 */
export function calcularCategoria({ ano, mes, metaMes, diarios, referencia }) {
  const dm = diasNoMes(ano, mes);
  const d = diarios ?? new Array(dm + 1).fill(0);
  const diaRef = referencia.dia;

  const semanas = semanasDoMes(ano, mes).map((s) => {
    const acumuladoAntes = somaDias(d, 1, s.inicio - 1);
    const meta = metaDaSemana(metaMes, dm, s.fim, acumuladoAntes);
    const realizado = reais(somaDias(d, s.inicio, s.fim));
    const dias = diasDaSemana(s, meta, d, diaRef).map((dia) => ({
      ...dia,
      // "passou" = dia encerrado. No mês passado, todos; no corrente, antes de hoje.
      passou: referencia.status === 'passado' || dia.dia < diaRef,
      ehHoje: referencia.status === 'corrente' && dia.dia === diaRef,
    }));
    return { ...s, meta, realizado, saldo: meta - realizado, dias };
  });

  const realizado = reais(somaDias(d, 1, dm));
  return {
    metaMes: Number(metaMes),
    realizado,
    saldo: Number(metaMes) - realizado,
    percentual: Number(metaMes) > 0 ? realizado / Number(metaMes) : null,
    comoDeveriaEstar: referencia.status === 'corrente' ? comoDeveriaEstar(metaMes, diaRef, dm) : null,
    semanas,
  };
}

/**
 * Cálculo do mês para todas as categorias variáveis.
 * @param {object} p
 * @param {{id: string, nome: string}[]} p.categorias
 * @param {Record<string, number>} p.metas categoria_id → meta do mês
 * @param {object[]} p.lancamentos linhas de `lancamentos` (pode incluir outros meses)
 * @param {string} p.hoje 'YYYY-MM-DD'
 */
export function calcularMes({ ano, mes, categorias, metas, lancamentos, hoje }) {
  const dm = diasNoMes(ano, mes);
  const referencia = referenciaDoMes(ano, mes, hoje);
  const diarios = realizadoDiario(lancamentos, ano, mes);

  const porCategoria = categorias.map((c) => ({
    categoria: c,
    ...calcularCategoria({ ano, mes, metaMes: metas[c.id] ?? 0, diarios: diarios.get(c.id), referencia }),
  }));

  const metaMes = porCategoria.reduce((s, c) => s + c.metaMes, 0);
  const realizadoCentavos = [...diarios.values()].reduce((s, arr) => s + somaDias(arr, 1, dm), 0);
  const realizado = reais(realizadoCentavos);

  return {
    ano,
    mes,
    dm,
    referencia,
    semanas: semanasDoMes(ano, mes),
    categorias: porCategoria,
    total: {
      metaMes,
      realizado,
      saldo: metaMes - realizado,
      percentual: metaMes > 0 ? realizado / metaMes : null,
      comoDeveriaEstar: referencia.status === 'corrente' ? comoDeveriaEstar(metaMes, referencia.dia, dm) : null,
    },
  };
}
