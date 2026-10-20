import { useState } from 'react';
import SeletorMes from '../componentes/SeletorMes.jsx';
import { diaDaSemana, exibirMeta, formatarBRL, parseData, resultadoDoDia } from '../lib/orcamento/index.js';
import { DIAS_CURTOS, MESES } from '../lib/rotulos.js';

/** Meta, realizado e saldo por categoria na semana, com o detalhe dia a dia. */
export default function Semana({ ano, mes, hoje, orcamento, onMudarMes }) {
  const { carregando, erro, resultado } = orcamento;
  const h = parseData(hoje);
  const ehMesAtual = h.ano === ano && h.mes === mes;
  const [escolhida, setEscolhida] = useState(null);
  const [aberta, setAberta] = useState(null);

  const topo = (
    <header className="tela-topo linha-topo">
      <h1>Semana</h1>
      <SeletorMes ano={ano} mes={mes} onChange={onMudarMes} />
    </header>
  );
  if (erro) return <section className="tela">{topo}<p className="erro">Não consegui carregar: {erro}</p></section>;
  if (carregando || !resultado) return <section className="tela">{topo}<p className="carregando">Carregando…</p></section>;

  const padrao = ehMesAtual ? resultado.semanas.find((s) => h.dia >= s.inicio && h.dia <= s.fim).numero : 1;
  const numero = escolhida ?? padrao;
  const semana = resultado.semanas[numero - 1];
  const linhas = resultado.categorias.map((c) => ({ ...c, semana: c.semanas[numero - 1] }));
  const total = linhas.reduce(
    (t, l) => ({ meta: t.meta + l.semana.meta, realizado: t.realizado + l.semana.realizado }),
    { meta: 0, realizado: 0 },
  );
  const saldoTotal = total.meta - total.realizado;
  const m = MESES[mes - 1];

  return (
    <section className="tela">
      {topo}

      <div className="abas-semana" role="tablist">
        {resultado.semanas.map((s) => (
          <button
            key={s.numero}
            role="tab"
            aria-selected={s.numero === numero}
            className={s.numero === numero ? 'ativo' : ''}
            onClick={() => setEscolhida(s.numero)}
          >
            <strong>S{s.numero}</strong>
            <span>{s.inicio === s.fim ? s.inicio : `${s.inicio}–${s.fim}`}</span>
          </button>
        ))}
      </div>

      <div className="card resumo-mes">
        <div>
          <span className="rotulo">Semana {numero} · {semana.inicio} a {semana.fim}/{m}</span>
          <strong>{formatarBRL(total.realizado)}</strong>
          <span className="sub"> de {formatarBRL(total.meta)}</span>
        </div>
        <div className="direita">
          <span className="rotulo">Saldo</span>
          <strong className={saldoTotal < 0 ? 'neg' : 'pos'}>{formatarBRL(saldoTotal)}</strong>
        </div>
      </div>

      <ul className="lista-categorias">
        {linhas.map((l) => {
          const s = l.semana;
          const meta = exibirMeta(s.meta, s.realizado);
          const expandida = aberta === l.categoria.id;
          return (
            <li key={l.categoria.id} className="card cartao-semana">
              <button
                className="linha-categoria sem-sombra"
                aria-expanded={expandida}
                onClick={() => setAberta(expandida ? null : l.categoria.id)}
              >
                <span className="cat-icone" style={{ background: `${l.categoria.cor}22` }}>{l.categoria.icone}</span>
                <span className="cat-info">
                  <span className="cat-nome">{l.categoria.nome}</span>
                  <span className="cat-sub">
                    Meta: <span className={meta.estourado ? 'neg' : ''}>{meta.texto}</span> · gasto {formatarBRL(s.realizado)}
                  </span>
                  {meta.percentual !== null && (
                    <span className="barra">
                      <span style={{ width: `${Math.min(100, meta.percentual * 100)}%`, background: meta.percentual > 1 ? 'var(--red)' : l.categoria.cor }} />
                    </span>
                  )}
                </span>
                <span className="cat-valor">
                  <span className="cat-sub">{s.saldo < 0 ? 'estourou' : 'saldo'}</span>
                  <strong className={s.saldo < 0 ? 'neg' : ''}>{formatarBRL(Math.abs(s.saldo))}</strong>
                </span>
                <span className={`seta ${expandida ? 'aberta' : ''}`} aria-hidden>›</span>
              </button>

              {expandida && (
                <table className="tabela-dias">
                  <thead>
                    <tr><th>Dia</th><th>Meta</th><th>Gasto</th><th>Resultado</th></tr>
                  </thead>
                  <tbody>
                    {s.dias.map((d) => {
                      const md = exibirMeta(d.meta);
                      const res = resultadoDoDia(d);
                      const futuro = !d.passou && !d.ehHoje;
                      return (
                        <tr key={d.dia} className={`${d.ehHoje ? 'hoje' : ''} ${futuro ? 'futuro' : ''}`}>
                          <td>{DIAS_CURTOS[diaDaSemana(ano, mes, d.dia)]} {d.dia}</td>
                          <td className={md.estourado ? 'neg' : ''}>
                            {md.estourado ? <><small>estourado em</small>{formatarBRL(-d.meta)}</> : md.texto}
                          </td>
                          <td>{d.realizado > 0 ? formatarBRL(d.realizado) : '–'}</td>
                          <td className={res ? (res.tipo === 'excedeu' ? 'neg' : 'pos') : ''}>
                            {d.ehHoje ? 'hoje' : res ? <><small>{res.tipo}</small>{formatarBRL(res.valor)}</> : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
