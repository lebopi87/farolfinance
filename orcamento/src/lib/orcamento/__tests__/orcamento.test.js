import { describe, it, expect } from 'vitest';
import brutos from './fixtures/lancamentos.json';
import {
  semanasDoMes,
  diasNoMes,
  calcularMes,
  provisaoCartao,
  fixosDoMes,
  rendaDoMes,
  fechamento,
  totalPorPessoa,
  resolverParametrosMes,
  parametrosDoMesAnterior,
  sugerirConciliacao,
  exibirMeta,
  resultadoDoDia,
  formatarBRL,
  formatarNumero,
  lerValor,
  arred2,
} from '../index.js';

// Fixture: 180 lançamentos reais importados da planilha. categoria_id = nome da categoria.
const lancamentos = brutos.map(([data, categoria_id, valor, total_parcelas, pessoa], i) => ({
  id: `l${i}`,
  data,
  categoria_id,
  valor,
  total_parcelas,
  pessoa,
  transacao_cartao_id: null,
}));

const NOMES = ['Alimentação', 'Almoço', 'Mercado', 'Lazer', 'Cachaça', 'Transporte', 'Cuidados pessoais', 'Pets', 'Extras'];
const categorias = NOMES.map((nome) => ({ id: nome, nome }));

const METAS = {
  '2026-8': { Alimentação: 960, Almoço: 1620, Cachaça: 500, Mercado: 2000, Lazer: 200, Transporte: 300, 'Cuidados pessoais': 400, Pets: 500, Extras: 200 },
  '2026-9': { Alimentação: 1100, Almoço: 1620, Cachaça: 400, Mercado: 2000, Lazer: 200, Transporte: 400, 'Cuidados pessoais': 300, Pets: 400, Extras: 300 },
  '2026-10': { Alimentação: 1400, Almoço: 1300, Cachaça: 400, Mercado: 2000, Lazer: 200, Transporte: 300, 'Cuidados pessoais': 400, Pets: 300, Extras: 400 },
};

const HOJE = '2026-10-20';
const mes = (ano, m, hoje = HOJE) =>
  calcularMes({ ano, mes: m, categorias, metas: METAS[`${ano}-${m}`], lancamentos, hoje });
const cat = (r, nome) => r.categorias.find((c) => c.categoria.nome === nome);

describe('semanas (domingo a sábado)', () => {
  it('setembro/2026 começa numa terça', () => {
    expect(semanasDoMes(2026, 9).map((s) => [s.inicio, s.fim])).toEqual([[1, 5], [6, 12], [13, 19], [20, 26], [27, 30]]);
  });
  it('outubro/2026 começa numa quinta', () => {
    expect(semanasDoMes(2026, 10).map((s) => [s.inicio, s.fim])).toEqual([[1, 3], [4, 10], [11, 17], [18, 24], [25, 31]]);
  });
  it('agosto/2026 tem 6 semanas (começa num sábado)', () => {
    expect(semanasDoMes(2026, 8).map((s) => [s.inicio, s.fim])).toEqual([[1, 1], [2, 8], [9, 15], [16, 22], [23, 29], [30, 31]]);
  });
  it('dias no mês, incluindo bissexto', () => {
    expect(diasNoMes(2026, 9)).toBe(30);
    expect(diasNoMes(2028, 2)).toBe(29);
  });
});

describe('setembro/2026', () => {
  const r = mes(2026, 9);
  it('total de variáveis realizado = 7.064,80 (parcelados não contam)', () => {
    expect(r.total.realizado).toBe(7064.8);
  });
  it('semana 1 de Alimentação (01–05/09) = 1.100 × 5/30 = 183,33', () => {
    expect(arred2(cat(r, 'Alimentação').semanas[0].meta)).toBe(183.33);
  });
  it('mês passado não mostra "como deveria estar"', () => {
    expect(r.total.comoDeveriaEstar).toBeNull();
    expect(cat(r, 'Alimentação').comoDeveriaEstar).toBeNull();
  });
});

describe('outubro/2026', () => {
  const r = mes(2026, 10);
  const alim = cat(r, 'Alimentação');

  it('total de variáveis realizado = 4.472,22', () => {
    expect(r.total.realizado).toBe(4472.22);
  });
  it('Alimentação realizado = 1.106,35', () => {
    expect(alim.realizado).toBe(1106.35);
  });
  it('semana 2 de Alimentação = 1.400 × 10/31 − 199,95 = 251,66', () => {
    expect(arred2(alim.semanas[1].meta)).toBe(251.66);
  });
  it('semana 3 de Alimentação = 1.400 × 17/31 − 421,22 = 346,52', () => {
    expect(arred2(alim.semanas[2].meta)).toBe(346.52);
  });
  it('semana 2 de Cachaça = 400 × 10/31 − 130,95 = −1,92 → "Estourado em R$ 1,92"', () => {
    const meta = cat(r, 'Cachaça').semanas[1].meta;
    expect(arred2(meta)).toBe(-1.92);
    expect(exibirMeta(meta, 184)).toEqual({ estourado: true, texto: 'Estourado em R$ 1,92', percentual: null });
  });

  it('meta do dia desconta só o realizado ANTES do dia (correção da planilha)', () => {
    // Semana 3 (11–17/10): meta 346,52; Alimentação gastou 523,69 no dia 12.
    const dias = alim.semanas[2].dias;
    expect(arred2(dias[0].meta)).toBe(arred2(346.5219 / 7)); // dia 11: nada gasto antes
    expect(arred2(dias[1].meta)).toBe(57.75); // dia 12: nada gasto antes; 346,52 / 6
    expect(arred2(dias[2].meta)).toBe(-35.43); // dia 13: (346,52 − 523,69) / 5
  });

  it('dias futuros dividem igualmente o que sobrou da semana', () => {
    const merc = cat(r, 'Mercado').semanas[3]; // 18–24/10, hoje = 20
    const realizadoAteHoje = merc.dias.filter((d) => d.dia <= 20).reduce((s, d) => s + d.realizado, 0);
    const esperado = (merc.meta - realizadoAteHoje) / 4;
    const futuros = merc.dias.filter((d) => d.dia > 20);
    expect(futuros).toHaveLength(4);
    for (const d of futuros) expect(d.meta).toBeCloseTo(esperado, 10);
  });

  it('marca dias passados e hoje', () => {
    const dias = alim.semanas[3].dias;
    expect(dias.find((d) => d.dia === 19)).toMatchObject({ passou: true, ehHoje: false });
    expect(dias.find((d) => d.dia === 20)).toMatchObject({ passou: false, ehHoje: true });
    expect(dias.find((d) => d.dia === 21)).toMatchObject({ passou: false, ehHoje: false });
  });

  it('"como deveria estar" = MetaMês × dia de hoje / dm', () => {
    expect(arred2(alim.comoDeveriaEstar)).toBe(arred2((1400 * 20) / 31));
    expect(r.total.metaMes).toBe(6700);
    expect(arred2(r.total.comoDeveriaEstar)).toBe(arred2((6700 * 20) / 31));
  });

  it('total por pessoa inclui parcelados pelo valor cheio', () => {
    const t = totalPorPessoa(lancamentos, 2026, 10);
    expect(arred2(t.leandro + t.daniele)).toBe(arred2(4472.22 + 1291.12));
  });
});

describe('provisão do cartão', () => {
  it('outubro = 171,57 + 1.238,43 = 1.410,00', () => {
    const p = provisaoCartao(lancamentos, 2026, 10, 1238.43);
    expect(arred2(p.somaParcelas)).toBe(171.57);
    expect(arred2(p.total)).toBe(1410);
  });
  it('novembro = 708,44', () => {
    expect(arred2(provisaoCartao(lancamentos, 2026, 11, 0).total)).toBe(708.44);
  });
  it('dezembro = 536,87', () => {
    expect(arred2(provisaoCartao(lancamentos, 2026, 12, 0).total)).toBe(536.87);
  });
  it('janeiro/2027 = 217,37', () => {
    expect(arred2(provisaoCartao(lancamentos, 2027, 1, 0).total)).toBe(217.37);
  });
  it('a janela começa no mês seguinte à compra', () => {
    const compra = [{ id: 'x', data: '2026-10-15', valor: 300, total_parcelas: 3 }];
    expect(provisaoCartao(compra, 2026, 10).total).toBe(0);
    expect(provisaoCartao(compra, 2026, 11).parcelas[0]).toMatchObject({ numero: 1, de: 3, valor: 100 });
    expect(provisaoCartao(compra, 2027, 1).parcelas[0]).toMatchObject({ numero: 3 });
    expect(provisaoCartao(compra, 2027, 2).total).toBe(0);
  });
});

describe('fixos, renda e fechamento', () => {
  const gf = (descricao, valor, extra = {}) => ({ id: descricao, descricao, valor, tipo: 'mensal', mes_inicio: 6, ano_inicio: 2026, ativo: true, ...extra });
  const gastosFixos = [
    gf('Aluguel', 3200), gf('Academia', 379.8), gf('Bilhete Único', 300), gf('Celular e Wi-Fi', 206),
    gf('Água e Energia', 250), gf('Assinaturas', 238.19), gf('Verisure', 281),
    gf('Pets Fixo (poupança)', 200), gf('Roupas (poupança)', 300), gf('Viagens (poupança)', 400),
    gf('Provisionamento do cartão', 2031.99), gf('Economia', 1800),
  ];
  const receitas = [
    { pessoa: 'leandro', tipo: 'fixo', mes: 6, ano: 2026, valor: 10000 },
    { pessoa: 'daniele', tipo: 'fixo', mes: 6, ano: 2026, valor: 5000 },
  ];

  it('ignora "Provisionamento do cartão" e "Economia"; separa poupanças', () => {
    const f = fixosDoMes(gastosFixos, [], 2026, 10);
    expect(f.fixos).toBe(4854.99);
    expect(f.poupancas).toBe(900);
  });
  it('lancamentos_fixos do mês prevalece sobre o valor padrão', () => {
    const f = fixosDoMes(gastosFixos, [{ gasto_fixo_id: 'Aluguel', mes: 10, ano: 2026, valor: 3300 }], 2026, 10);
    expect(f.fixos).toBe(4954.99);
  });
  it('fixos fora da vigência não contam', () => {
    expect(fixosDoMes(gastosFixos, [], 2026, 5).fixos).toBe(0);
  });

  it('renda repete as fixas mais recentes quando o mês não tem receita', () => {
    const r = rendaDoMes(receitas, 2026, 10);
    expect(r.total).toBe(15000);
    expect(r.porPessoa).toEqual({ leandro: 10000, daniele: 5000 });
    expect(r.herdadoDe).toEqual({ ano: 2026, mes: 6 });
  });
  it('renda usa o próprio mês quando existe', () => {
    const r = rendaDoMes([...receitas, { pessoa: 'leandro', tipo: 'eventual', mes: 10, ano: 2026, valor: 800 }], 2026, 10);
    expect(r.total).toBe(800);
    expect(r.herdadoDe).toBeNull();
  });

  it('fechamento de outubro/2026', () => {
    const f = fixosDoMes(gastosFixos, [], 2026, 10);
    const res = fechamento({
      renda: rendaDoMes(receitas, 2026, 10).total,
      fixos: f.fixos,
      poupancas: f.poupancas,
      provisao: provisaoCartao(lancamentos, 2026, 10, 1238.43).total,
      metaEconomia: 1000,
      somaMetas: 6700,
    });
    // 15.000 − (4.854,99 + 900 + 1.410 + 1.000 + 6.700)
    expect(arred2(res.sobra)).toBe(135.01);
  });
});

describe('parâmetros do mês (herança)', () => {
  const metasMensais = Object.entries(METAS).flatMap(([k, metas]) => {
    const [ano, m] = k.split('-').map(Number);
    return Object.entries(metas).map(([categoria_id, valor]) => ({ categoria_id, ano, mes: m, valor }));
  });
  const orcamentos = [
    { ano: 2026, mes: 9, meta_economia: 900, provisao_extra: 0 },
    { ano: 2026, mes: 10, meta_economia: 1000, provisao_extra: 1238.43 },
  ];
  const metasCategoria = NOMES.map((n) => ({ categoria: n, meta_mensal: 111, ativo: true }));

  it('mês com metas próprias não grava nada', () => {
    const p = resolverParametrosMes({ ano: 2026, mes: 10, categorias, metasMensais, orcamentos, metasCategoria });
    expect(p.metas.Alimentação).toBe(1400);
    expect(p.metaEconomia).toBe(1000);
    expect(p.provisaoExtra).toBe(1238.43);
    expect(p.temProprios).toBe(true);
    expect(p.aGravar.metasMensais).toHaveLength(0);
    expect(p.aGravar.orcamentoMes).toBeNull();
  });
  it('mês novo copia metas e meta_economia do anterior (provisão extra não é herdada)', () => {
    const p = resolverParametrosMes({ ano: 2026, mes: 11, categorias, metasMensais, orcamentos, metasCategoria });
    expect(p.metas.Alimentação).toBe(1400);
    expect(p.origem.Alimentação).toBe('anterior');
    expect(p.metaEconomia).toBe(1000);
    expect(p.provisaoExtra).toBe(0);
    expect(p.aGravar.metasMensais).toHaveLength(9);
    expect(p.aGravar.orcamentoMes).toEqual({ mes: 11, ano: 2026, meta_economia: 1000, provisao_extra: 0 });
  });
  it('sem mês anterior, usa metas_categoria', () => {
    const p = resolverParametrosMes({ ano: 2026, mes: 1, categorias, metasMensais, orcamentos, metasCategoria });
    expect(p.metas.Mercado).toBe(111);
    expect(p.origem.Mercado).toBe('padrao');
    expect(p.metaEconomia).toBe(0);
  });
  it('"copiar do mês anterior" traz os valores do mês imediatamente anterior', () => {
    const p = parametrosDoMesAnterior({ ano: 2026, mes: 10, categorias, metasMensais, orcamentos, metasCategoria });
    expect(p.metas.Alimentação).toBe(1100);
    expect(p.metaEconomia).toBe(900);
  });
});

describe('exibição', () => {
  it('percentual só com meta > 0', () => {
    expect(exibirMeta(200, 50).percentual).toBe(0.25);
    expect(exibirMeta(0, 50)).toEqual({ estourado: false, texto: 'R$ 0,00', percentual: null });
  });
  it('Economizou / Excedeu só para dias passados com meta', () => {
    expect(resultadoDoDia({ meta: 50, realizado: 30, passou: true }).texto).toBe('Economizou R$ 20,00');
    expect(resultadoDoDia({ meta: 50, realizado: 80, passou: true }).texto).toBe('Excedeu R$ 30,00');
    expect(resultadoDoDia({ meta: 50, realizado: 30, passou: false })).toBeNull();
    expect(resultadoDoDia({ meta: -5, realizado: 30, passou: true })).toBeNull();
    expect(resultadoDoDia({ meta: 0, realizado: 0, passou: true })).toBeNull();
  });
  it('formata reais', () => {
    expect(formatarBRL(1234567.891)).toBe('R$ 1.234.567,89');
    expect(formatarBRL(-1.918)).toBe('-R$ 1,92');
    expect(formatarNumero(4106.4516)).toBe('4.106,45');
  });
  it('lê o valor digitado no lançamento', () => {
    expect(lerValor('12,50')).toBe(12.5);
    expect(lerValor('1.234,56')).toBe(1234.56);
    expect(lerValor('12.5')).toBe(12.5);
    expect(lerValor('R$ 8')).toBe(8);
    expect(lerValor('0')).toBeNull();
    expect(lerValor('abc')).toBeNull();
    expect(lerValor('1,234')).toBeNull();
  });
});

describe('conciliação', () => {
  const lanc = [
    { id: 'a', data: '2026-11-03', valor: 50, total_parcelas: 1, transacao_cartao_id: null },
    { id: 'b', data: '2026-11-05', valor: 50, total_parcelas: 1, transacao_cartao_id: null },
    { id: 'c', data: '2026-11-10', valor: 300, total_parcelas: 3, transacao_cartao_id: null },
    { id: 'd', data: '2026-11-12', valor: 70, total_parcelas: 1, transacao_cartao_id: 't9' },
  ];
  const tx = [
    { id: 't1', data_compra: '2026-11-05', valor_brl: 50, tipo: 'compra' },
    { id: 't2', data_compra: '2026-11-04', valor_brl: 50, tipo: 'compra' },
    { id: 't3', data_compra: '2026-11-11', valor_brl: 100, tipo: 'compra', parcela_atual: 1, total_parcelas: 3 },
    { id: 't4', data_compra: '2026-10-11', valor_brl: 100, tipo: 'compra', parcela_atual: 2, total_parcelas: 3 },
    { id: 't5', data_compra: '2026-11-20', valor_brl: 50, tipo: 'compra' },
    { id: 't6', data_compra: '2026-11-09', valor_brl: 50, tipo: 'compra' },
    { id: 't9', data_compra: '2026-11-12', valor_brl: 70, tipo: 'compra' },
    { id: 't7', data_compra: '2026-11-12', valor_brl: -20, tipo: 'estorno' },
  ];
  const r = Object.fromEntries(sugerirConciliacao(tx, lanc).map((x) => [x.transacao.id, x]));

  it('pareia por valor e data ±3 dias, preferindo a data mais próxima', () => {
    expect(r.t1).toMatchObject({ status: 'sugerido', lancamento: { id: 'b' } });
    expect(r.t2).toMatchObject({ status: 'sugerido', lancamento: { id: 'a' } });
  });
  it('parcela 1/N casa com o lançamento parcelado pelo valor cheio', () => {
    expect(r.t3).toMatchObject({ status: 'sugerido', lancamento: { id: 'c' } });
  });
  it('parcela 2/N em diante vai para a provisão', () => {
    expect(r.t4.status).toBe('provisao');
  });
  it('compra sem lançamento fica como não lançada (lançamento já usado ou fora da janela)', () => {
    expect(r.t5.status).toBe('nao_lancada');
    expect(r.t6.status).toBe('nao_lancada');
  });
  it('já vinculada e estorno', () => {
    expect(r.t9).toMatchObject({ status: 'vinculado', lancamento: { id: 'd' } });
    expect(r.t7.status).toBe('ignorada');
  });
});
