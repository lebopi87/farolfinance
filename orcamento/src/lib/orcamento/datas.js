// Utilitários de data em calendário puro (sem fuso horário).
// Datas trafegam como string ISO 'YYYY-MM-DD', como vêm do Supabase.

/** Número de dias do mês (mes de 1 a 12). */
export function diasNoMes(ano, mes) {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** Dia da semana: 0 = domingo … 6 = sábado. */
export function diaDaSemana(ano, mes, dia) {
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

/** 'YYYY-MM-DD' → { ano, mes, dia } */
export function parseData(iso) {
  const [ano, mes, dia] = String(iso).slice(0, 10).split('-').map(Number);
  return { ano, mes, dia };
}

export function formatarISO(ano, mes, dia) {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Índice absoluto do mês, para comparar e somar meses. */
export function indiceMes(ano, mes) {
  return ano * 12 + (mes - 1);
}

export function somarMeses(ano, mes, n) {
  const i = indiceMes(ano, mes) + n;
  return { ano: Math.floor(i / 12), mes: (i % 12) + 1 };
}

/** Diferença em dias entre duas datas ISO (b − a). */
export function diferencaDias(a, b) {
  const pa = parseData(a);
  const pb = parseData(b);
  return Math.round(
    (Date.UTC(pb.ano, pb.mes - 1, pb.dia) - Date.UTC(pa.ano, pa.mes - 1, pa.dia)) / 86400000,
  );
}

/**
 * Semanas do mês, de domingo a sábado. A primeira e a última podem ser
 * parciais; um mês pode ter até 6 semanas.
 * @returns {{ numero: number, inicio: number, fim: number }[]} dias do mês
 */
export function semanasDoMes(ano, mes) {
  const dm = diasNoMes(ano, mes);
  const semanas = [];
  let inicio = 1;
  while (inicio <= dm) {
    const fim = Math.min(dm, inicio + (6 - diaDaSemana(ano, mes, inicio)));
    semanas.push({ numero: semanas.length + 1, inicio, fim });
    inicio = fim + 1;
  }
  return semanas;
}

/** Semana do mês que contém o dia. */
export function semanaDoDia(ano, mes, dia) {
  return semanasDoMes(ano, mes).find((s) => dia >= s.inicio && dia <= s.fim);
}

/** Data de hoje no fuso local do aparelho, como ISO. */
export function hojeISO(agora = new Date()) {
  return formatarISO(agora.getFullYear(), agora.getMonth() + 1, agora.getDate());
}
