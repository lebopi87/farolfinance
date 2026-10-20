import { exibirMeta, formatarBRL, formatarPercentual, parseData } from '../lib/orcamento/index.js';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** Tela inicial: quanto dá para gastar hoje em cada categoria. */
export default function Hoje({ hoje, orcamento, onLancar }) {
  const { carregando, erro, resultado } = orcamento;
  const h = parseData(hoje);
  const diaSemana = DIAS[new Date(h.ano, h.mes - 1, h.dia).getDay()];

  if (erro) return <p className="erro bloco">Não consegui carregar: {erro}</p>;
  if (carregando || !resultado) return <p className="carregando">Carregando…</p>;

  const semana = resultado.semanas.find((s) => h.dia >= s.inicio && h.dia <= s.fim);
  const linhas = resultado.categorias.map((c) => {
    const s = c.semanas[semana.numero - 1];
    const dia = s.dias.find((d) => d.dia === h.dia);
    return { ...c, semana: s, dia };
  });

  const podeHoje = linhas.reduce((t, l) => t + Math.max(0, l.dia.disponivel), 0);
  const gastoHoje = linhas.reduce((t, l) => t + l.dia.realizado, 0);
  const { total } = resultado;
  const adiantado = total.realizado - total.comoDeveriaEstar;

  return (
    <section className="tela">
      <header className="tela-topo">
        <h1>Hoje</h1>
        <p className="sub">
          {diaSemana}, {h.dia} de {MESES[h.mes - 1]} · semana {semana.numero} ({semana.inicio} a {semana.fim}/{MESES[h.mes - 1]})
        </p>
      </header>

      <div className="hero">
        <span className="hero-rotulo">Pode gastar hoje</span>
        <strong className="hero-valor">{formatarBRL(podeHoje)}</strong>
        <span className="hero-sub">Gasto hoje: {formatarBRL(gastoHoje)}</span>
      </div>

      <div className="card resumo-mes">
        <div>
          <span className="rotulo">Mês</span>
          <strong>{formatarBRL(total.realizado)}</strong>
          <span className="sub"> de {formatarBRL(total.metaMes)}</span>
        </div>
        <div className="direita">
          <span className="rotulo">Deveria estar em</span>
          <strong>{formatarBRL(total.comoDeveriaEstar)}</strong>
          <span className={adiantado > 0 ? 'neg' : 'pos'}>
            {adiantado > 0 ? `${formatarBRL(adiantado)} acima` : `${formatarBRL(-adiantado)} abaixo`}
          </span>
        </div>
      </div>

      <ul className="lista-categorias">
        {linhas.map((l) => {
          const hojeExib = exibirMeta(l.dia.disponivel);
          const semExib = exibirMeta(l.semana.saldo);
          const pct = l.metaMes > 0 ? l.realizado / l.metaMes : null;
          return (
            <li key={l.categoria.id}>
              <button className="card linha-categoria" onClick={() => onLancar(l.categoria.id)}>
                <span className="cat-icone" style={{ background: `${l.categoria.cor}22` }}>
                  {l.categoria.icone}
                </span>
                <span className="cat-info">
                  <span className="cat-nome">{l.categoria.nome}</span>
                  <span className="cat-sub">
                    Semana: {semExib.estourado ? `estourou ${formatarBRL(-l.semana.saldo)}` : `sobra ${semExib.texto}`}
                  </span>
                  {pct !== null && (
                    <span className="barra" aria-label={`Mês: ${formatarPercentual(pct)} da meta`}>
                      <span style={{ width: `${Math.min(100, pct * 100)}%`, background: pct > 1 ? 'var(--red)' : l.categoria.cor }} />
                    </span>
                  )}
                </span>
                <span className="cat-valor">
                  <span className="cat-sub">{hojeExib.estourado ? 'estourou hoje' : 'pode gastar'}</span>
                  <strong className={hojeExib.estourado ? 'neg' : ''}>
                    {hojeExib.estourado ? formatarBRL(-l.dia.disponivel) : hojeExib.texto}
                  </strong>
                  {l.dia.realizado > 0 && <span className="cat-sub">gastou {formatarBRL(l.dia.realizado)}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
