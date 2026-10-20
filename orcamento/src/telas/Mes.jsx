import { useState } from 'react';
import SeletorMes from '../componentes/SeletorMes.jsx';
import { useFechamento } from '../hooks/useFechamento.js';
import { formatarBRL, formatarNumero, formatarPercentual } from '../lib/orcamento/index.js';
import { MESES, PESSOAS } from '../lib/rotulos.js';

/** Metas e realizado do mês por categoria, fechamento e total por pessoa. */
export default function Mes({ ano, mes, orcamento, onMudarMes }) {
  const { carregando, erro, resultado } = orcamento;
  const fech = useFechamento(ano, mes, orcamento);

  const topo = (
    <header className="tela-topo linha-topo">
      <h1>Mês</h1>
      <SeletorMes ano={ano} mes={mes} onChange={onMudarMes} />
    </header>
  );
  if (erro) return <section className="tela">{topo}<p className="erro">Não consegui carregar: {erro}</p></section>;
  if (carregando || !resultado) return <section className="tela">{topo}<p className="carregando">Carregando…</p></section>;

  const { total, referencia } = resultado;
  const corrente = referencia.status === 'corrente';
  const acima = corrente ? total.realizado - total.comoDeveriaEstar : 0;

  return (
    <section className="tela">
      {topo}

      <div className="card resumo-mes">
        <div>
          <span className="rotulo">Variáveis</span>
          <strong>{formatarBRL(total.realizado)}</strong>
          <span className="sub"> de {formatarBRL(total.metaMes)}</span>
          {total.percentual !== null && <span className="sub bloco-sub">{formatarPercentual(total.percentual)} da meta</span>}
        </div>
        {corrente && (
          <div className="direita">
            <span className="rotulo">Deveria estar em</span>
            <strong>{formatarBRL(total.comoDeveriaEstar)}</strong>
            <span className={acima > 0 ? 'neg' : 'pos'}>
              {formatarBRL(Math.abs(acima))} {acima > 0 ? 'acima' : 'abaixo'}
            </span>
          </div>
        )}
      </div>

      <div className="card tabela-card">
        <table className="tabela-mes">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Meta R$</th>
              <th>Gasto</th>
              <th>%</th>
              {corrente && <th>Deveria</th>}
            </tr>
          </thead>
          <tbody>
            {resultado.categorias.map((c) => {
              const estourou = c.metaMes > 0 && c.realizado > c.metaMes;
              const adiantada = corrente && c.realizado > c.comoDeveriaEstar;
              return (
                <tr key={c.categoria.id}>
                  <td className="nome-cat"><span className="emoji">{c.categoria.icone}</span>{c.categoria.nome}</td>
                  <td>{formatarNumero(c.metaMes)}</td>
                  <td className={estourou ? 'neg' : ''}>{formatarNumero(c.realizado)}</td>
                  <td className={estourou ? 'neg' : ''}>{c.percentual !== null ? formatarPercentual(c.percentual) : '–'}</td>
                  {corrente && <td className={adiantada ? 'neg' : 'pos'}>{formatarNumero(c.comoDeveriaEstar)}</td>}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td>{formatarNumero(total.metaMes)}</td>
              <td>{formatarNumero(total.realizado)}</td>
              <td>{total.percentual !== null ? formatarPercentual(total.percentual) : '–'}</td>
              {corrente && <td>{formatarNumero(total.comoDeveriaEstar)}</td>}
            </tr>
          </tfoot>
        </table>
      </div>

      <h2 className="titulo-secao">Fechamento</h2>
      {fech.erro ? (
        <p className="erro">Não consegui carregar o fechamento: {fech.erro}</p>
      ) : fech.carregando ? (
        <p className="carregando">Carregando…</p>
      ) : (
        <Fechamento fech={fech} />
      )}

      {!fech.carregando && !fech.erro && (
        <>
          <h2 className="titulo-secao">Gasto por pessoa</h2>
          <p className="sub nota">Todos os lançamentos do mês, parcelados pelo valor cheio.</p>
          <div className="card linhas">
            {Object.keys(PESSOAS).map((p) => (
              <div className="linha" key={p}>
                <span>{PESSOAS[p]}</span>
                <strong>{formatarBRL(fech.porPessoa[p] ?? 0)}</strong>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Fechamento({ fech }) {
  const [verParcelas, setVerParcelas] = useState(false);
  const { fechamento: f, renda, provisao } = fech;
  const herdada = renda.herdadoDe ? ` (repetindo ${MESES[renda.herdadoDe.mes - 1]}/${renda.herdadoDe.ano})` : '';

  return (
    <div className="card linhas">
      <div className="linha">
        <span>Renda<small className="sub">{herdada}</small></span>
        <strong className="pos">{formatarBRL(f.renda)}</strong>
      </div>
      <div className="linha"><span>− Fixos</span><span>{formatarBRL(f.fixos)}</span></div>
      <div className="linha"><span>− Poupanças</span><span>{formatarBRL(f.poupancas)}</span></div>
      <button className="linha linha-botao" onClick={() => setVerParcelas((v) => !v)} aria-expanded={verParcelas}>
        <span>− Provisão do cartão <small className="sub">{verParcelas ? '▾' : '▸'}</small></span>
        <span>{formatarBRL(f.provisao)}</span>
      </button>
      {verParcelas && (
        <ul className="parcelas">
          {provisao.parcelas.map((p) => (
            <li key={p.lancamento.id}>
              <span>
                {p.lancamento.categorias?.icone} {p.lancamento.categorias?.nome} · {p.numero}/{p.de}
                <small className="sub"> compra {p.lancamento.data.split('-').reverse().slice(0, 2).join('/')}</small>
              </span>
              <span>{formatarBRL(p.valor)}</span>
            </li>
          ))}
          {provisao.extra !== 0 && (
            <li><span>Provisão extra</span><span>{formatarBRL(provisao.extra)}</span></li>
          )}
          {provisao.parcelas.length === 0 && provisao.extra === 0 && <li><span className="sub">Nenhuma parcela neste mês.</span></li>}
        </ul>
      )}
      <div className="linha"><span>− Meta de economia</span><span>{formatarBRL(f.metaEconomia)}</span></div>
      <div className="linha"><span>− Metas variáveis</span><span>{formatarBRL(f.somaMetas)}</span></div>
      <div className="linha total">
        <span>Sobra</span>
        <strong className={f.sobra < 0 ? 'neg' : 'pos'}>{formatarBRL(f.sobra)}</strong>
      </div>
    </div>
  );
}
