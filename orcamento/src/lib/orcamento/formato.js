// Regras de exibição (corrigem os bugs da planilha).

export const arred2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

/** 1234.5 → 'R$ 1.234,50' (espaço comum, negativos como '-R$ 1,92'). */
export function formatarBRL(v) {
  const n = arred2(v);
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  const milhar = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0 ? '-' : ''}R$ ${milhar},${dec}`;
}

export function formatarPercentual(fracao) {
  return `${Math.round(fracao * 100)}%`;
}

/**
 * Exibição de uma meta frente ao realizado.
 * - Meta negativa → "Estourado em R$ X", sem percentual.
 * - Percentual só quando a meta é maior que zero.
 */
export function exibirMeta(meta, realizado = 0) {
  const m = arred2(meta);
  if (m < 0) {
    return { estourado: true, texto: `Estourado em ${formatarBRL(-m)}`, percentual: null };
  }
  return {
    estourado: false,
    texto: formatarBRL(m),
    percentual: m > 0 ? arred2(realizado) / m : null,
  };
}

/**
 * Resultado do dia: "Economizou" / "Excedeu" só para dias que já passaram e
 * que tiveram meta (> 0). Nos demais casos, retorna null.
 */
export function resultadoDoDia({ meta, realizado, passou }) {
  const m = arred2(meta);
  if (!passou || m <= 0) return null;
  const diff = arred2(m - realizado);
  return diff >= 0
    ? { tipo: 'economizou', valor: diff, texto: `Economizou ${formatarBRL(diff)}` }
    : { tipo: 'excedeu', valor: -diff, texto: `Excedeu ${formatarBRL(-diff)}` };
}

/** Valor digitado ('12,50', '1.234,56', '12.5', 'R$ 8') → número, ou null se inválido. */
export function lerValor(texto) {
  let s = String(texto ?? '').replace(/R\$|\s/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return n > 0 ? n : null;
}
