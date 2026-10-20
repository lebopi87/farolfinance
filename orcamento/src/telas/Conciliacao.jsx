import { useEffect, useMemo, useState } from 'react';
import { carregarConciliacao, carregarFaturas, vincularLancamento } from '../lib/dados.js';
import { formatarBRL, parseData, sugerirConciliacao } from '../lib/orcamento/index.js';
import { MESES, PESSOAS } from '../lib/rotulos.js';

const dataCurta = (iso) => {
  const d = parseData(iso);
  return `${d.dia}/${String(d.mes).padStart(2, '0')}`;
};
const parcela = (t) => (Number(t.total_parcelas) > 1 ? ` · ${t.parcela_atual ?? 1}/${t.total_parcelas}` : '');

/**
 * Pareia compras da fatura com lançamentos (mesmo valor, ±3 dias, ainda não
 * vinculados). Cada par só é gravado quando confirmado.
 */
export default function Conciliacao({ categorias, versao, onLancarCompra, onAlterado }) {
  const [faturas, setFaturas] = useState(null);
  const [faturaId, setFaturaId] = useState('');
  const [dados, setDados] = useState(null);
  const [rejeitados, setRejeitados] = useState(() => new Set());
  const [ocupado, setOcupado] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    carregarFaturas()
      .then((f) => {
        setFaturas(f);
        setFaturaId((atual) => atual || f[0]?.id || '');
      })
      .catch((e) => setErro(e.message));
  }, []);

  useEffect(() => {
    if (!faturaId) return;
    let vivo = true;
    carregarConciliacao(faturaId)
      .then((d) => vivo && setDados(d))
      .catch((e) => vivo && setErro(e.message));
    return () => {
      vivo = false;
    };
  }, [faturaId, versao]);

  const itens = useMemo(
    () => (dados ? sugerirConciliacao(dados.transacoes, dados.lancamentos, rejeitados) : []),
    [dados, rejeitados],
  );
  const grupo = (status) => itens.filter((i) => i.status === status);
  const porId = Object.fromEntries(categorias.map((c) => [c.id, c]));

  async function vincular(lancamentoId, transacaoId, msg) {
    setOcupado(lancamentoId);
    setErro(null);
    try {
      await vincularLancamento(lancamentoId, transacaoId);
      setDados(await carregarConciliacao(faturaId));
      onAlterado(msg);
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(null);
    }
  }

  if (erro && !faturas) return <p className="erro">Não consegui carregar: {erro}</p>;
  if (!faturas) return <p className="carregando">Carregando…</p>;
  if (!faturas.length) return <p className="carregando">Nenhuma fatura importada ainda.</p>;

  const sugeridos = grupo('sugerido');
  const naoLancadas = grupo('nao_lancada');
  const vinculados = grupo('vinculado');
  const provisao = grupo('provisao');
  const fixos = grupo('fixo');

  return (
    <>
      <header className="tela-topo">
        <h1>Conciliação</h1>
      </header>

      <select className="seletor-fatura" value={faturaId} onChange={(e) => { setDados(null); setRejeitados(new Set()); setFaturaId(e.target.value); }} aria-label="Fatura">
        {faturas.map((f) => (
          <option key={f.id} value={f.id}>
            {f.cartoes?.nome ?? 'Cartão'} · {MESES[f.mes - 1]}/{f.ano} · {formatarBRL(f.valor_total)}
          </option>
        ))}
      </select>

      {erro && <p className="erro">{erro}</p>}
      {!dados ? (
        <p className="carregando">Carregando…</p>
      ) : (
        <>
          <div className="contagens">
            <span className="selo">{sugeridos.length} {sugeridos.length === 1 ? 'sugestão' : 'sugestões'}</span>
            <span className="selo alerta">{naoLancadas.length} não {naoLancadas.length === 1 ? 'lançada' : 'lançadas'}</span>
            <span className="selo ok">{vinculados.length} {vinculados.length === 1 ? 'conciliada' : 'conciliadas'}</span>
            <span className="selo neutro">{provisao.length} na provisão</span>
          </div>

          <h2 className="titulo-secao">Sugestões</h2>
          {sugeridos.length === 0 && <p className="sub nota">Nenhum par encontrado com mesmo valor e data ±3 dias.</p>}
          {sugeridos.map(({ transacao: t, lancamento: l, diferencaDias }) => {
            const c = porId[l.categoria_id];
            return (
              <div key={t.id} className="card par">
                <div className="par-lado">
                  <span className="rotulo">Fatura</span>
                  <span className="par-nome">{t.estabelecimento}</span>
                  <span className="cat-sub">{dataCurta(t.data_compra)}{parcela(t)}</span>
                  <strong>{formatarBRL(t.valor_brl)}</strong>
                </div>
                <span className="par-seta" aria-hidden>⇄</span>
                <div className="par-lado">
                  <span className="rotulo">Lançamento</span>
                  <span className="par-nome">{c?.icone} {c?.nome}</span>
                  <span className="cat-sub">
                    {dataCurta(l.data)} · {PESSOAS[l.pessoa]}
                    {diferencaDias > 0 && ` · ${diferencaDias}d de diferença`}
                  </span>
                  <strong>{formatarBRL(l.valor)}{Number(l.total_parcelas) > 1 && <small className="sub"> ({l.total_parcelas}x)</small>}</strong>
                </div>
                <div className="par-acoes">
                  <button className="btn-texto" onClick={() => setRejeitados((r) => new Set(r).add(`${t.id}:${l.id}`))}>
                    Não é esse
                  </button>
                  <button className="btn-pequeno" disabled={ocupado === l.id} onClick={() => vincular(l.id, t.id, `Conciliado: ${t.estabelecimento}`)}>
                    {ocupado === l.id ? 'Salvando…' : 'Confirmar'}
                  </button>
                </div>
              </div>
            );
          })}

          <h2 className="titulo-secao">Não lançadas</h2>
          {naoLancadas.length === 0 ? (
            <p className="sub nota">Todas as compras desta fatura têm lançamento.</p>
          ) : (
            <ul className="card lista-lanc nao-lancadas">
              {naoLancadas.map(({ transacao: t }) => (
                <li key={t.id} className="item-lanc">
                  <span className="cat-icone pequeno">{t.categorias?.icone ?? '💳'}</span>
                  <span className="cat-info">
                    <span className="cat-nome">{t.estabelecimento}</span>
                    <span className="cat-sub">{dataCurta(t.data_compra)}{parcela(t)} · {t.categorias?.nome ?? 'sem categoria'}</span>
                  </span>
                  <span className="cat-valor">
                    <strong>{formatarBRL(t.valor_brl)}</strong>
                    <button className="btn-texto" onClick={() => onLancarCompra(t)}>Lançar</button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <Recolhivel titulo="Conciliadas" itens={vinculados}>
            {({ transacao: t, lancamento: l }) => (
              <>
                <span className="cat-info">
                  <span className="cat-nome">{t.estabelecimento}</span>
                  <span className="cat-sub">{dataCurta(t.data_compra)} · {porId[l.categoria_id]?.nome} · {PESSOAS[l.pessoa]}</span>
                </span>
                <span className="cat-valor">
                  <strong>{formatarBRL(t.valor_brl)}</strong>
                  <button className="btn-texto" disabled={ocupado === l.id} onClick={() => vincular(l.id, null, `Desfeito: ${t.estabelecimento}`)}>
                    Desfazer
                  </button>
                </span>
              </>
            )}
          </Recolhivel>

          <Recolhivel titulo="Parcelas na provisão do cartão" nota="Parcelas 2/N em diante já estão na provisão; não viram lançamento." itens={provisao}>
            {({ transacao: t }) => (
              <>
                <span className="cat-info">
                  <span className="cat-nome">{t.estabelecimento}</span>
                  <span className="cat-sub">compra {dataCurta(t.data_compra)}{parcela(t)}</span>
                </span>
                <span className="cat-valor"><strong>{formatarBRL(t.valor_brl)}</strong></span>
              </>
            )}
          </Recolhivel>

          {fixos.length > 0 && (
            <Recolhivel titulo="Gastos fixos" itens={fixos}>
              {({ transacao: t }) => (
                <>
                  <span className="cat-info"><span className="cat-nome">{t.estabelecimento}</span></span>
                  <span className="cat-valor"><strong>{formatarBRL(t.valor_brl)}</strong></span>
                </>
              )}
            </Recolhivel>
          )}
        </>
      )}
    </>
  );
}

function Recolhivel({ titulo, nota, itens, children }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button className="titulo-secao titulo-botao" onClick={() => setAberto((a) => !a)} aria-expanded={aberto}>
        {titulo} <small className="sub">({itens.length}) {aberto ? '▾' : '▸'}</small>
      </button>
      {aberto && nota && <p className="sub nota">{nota}</p>}
      {aberto && itens.length > 0 && (
        <ul className="card lista-lanc">
          {itens.map((i) => (
            <li key={i.transacao.id} className="item-lanc">{children(i)}</li>
          ))}
        </ul>
      )}
    </>
  );
}
