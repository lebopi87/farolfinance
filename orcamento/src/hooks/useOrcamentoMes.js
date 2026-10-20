import { useCallback, useEffect, useMemo, useState } from 'react';
import { carregarCategorias, carregarLancamentosDoMes, garantirParametrosMes } from '../lib/dados.js';
import { calcularMes } from '../lib/orcamento/index.js';

/** Carrega categorias, parâmetros e lançamentos do mês e calcula metas e realizado. */
export function useOrcamentoMes(ano, mes, hoje) {
  const [estado, setEstado] = useState({ carregando: true, erro: null, categorias: [], parametros: null, lancamentos: [] });

  const recarregar = useCallback(async () => {
    try {
      const categorias = await carregarCategorias();
      const [parametros, lancamentos] = await Promise.all([
        garantirParametrosMes(ano, mes, categorias),
        carregarLancamentosDoMes(ano, mes),
      ]);
      setEstado({ carregando: false, erro: null, categorias, parametros, lancamentos });
    } catch (e) {
      setEstado((s) => ({ ...s, carregando: false, erro: e.message }));
    }
  }, [ano, mes]);

  useEffect(() => {
    setEstado((s) => ({ ...s, carregando: true }));
    recarregar();
  }, [recarregar]);

  const resultado = useMemo(() => {
    if (!estado.parametros) return null;
    return calcularMes({
      ano,
      mes,
      categorias: estado.categorias,
      metas: estado.parametros.metas,
      lancamentos: estado.lancamentos,
      hoje,
    });
  }, [estado, ano, mes, hoje]);

  return { ...estado, resultado, recarregar };
}
