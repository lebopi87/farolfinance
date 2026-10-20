import { useEffect, useState } from 'react';
import { carregarBaseFechamento, carregarParceladosAntes } from '../lib/dados.js';
import { fechamento, fixosDoMes, provisaoCartao, rendaDoMes, totalPorPessoa } from '../lib/orcamento/index.js';

/** Fechamento do mês: renda − (fixos + poupanças + provisão + economia + Σ metas). */
export function useFechamento(ano, mes, orcamento) {
  const [base, setBase] = useState({ carregando: true, erro: null });

  useEffect(() => {
    let vivo = true;
    setBase({ carregando: true, erro: null });
    Promise.all([carregarBaseFechamento(), carregarParceladosAntes(ano, mes)])
      .then(([b, parcelados]) => vivo && setBase({ carregando: false, erro: null, ...b, parcelados }))
      .catch((e) => vivo && setBase({ carregando: false, erro: e.message }));
    return () => {
      vivo = false;
    };
  }, [ano, mes]);

  const { parametros, resultado, lancamentos } = orcamento;
  if (base.carregando || base.erro || !parametros || !resultado) {
    return { carregando: base.carregando || orcamento.carregando, erro: base.erro ?? orcamento.erro };
  }

  const renda = rendaDoMes(base.receitas, ano, mes);
  const fixos = fixosDoMes(base.gastosFixos, base.lancamentosFixos, ano, mes);
  const provisao = provisaoCartao(base.parcelados, ano, mes, parametros.provisaoExtra);
  return {
    carregando: false,
    erro: null,
    renda,
    fixos,
    provisao,
    porPessoa: totalPorPessoa(lancamentos, ano, mes),
    fechamento: fechamento({
      renda: renda.total,
      fixos: fixos.fixos,
      poupancas: fixos.poupancas,
      provisao: provisao.total,
      metaEconomia: parametros.metaEconomia,
      somaMetas: resultado.total.metaMes,
    }),
  };
}
