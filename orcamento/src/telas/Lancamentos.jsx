import { useState } from 'react';
import SeletorMes from '../componentes/SeletorMes.jsx';
import { diaDaSemana, ehAVista, formatarBRL, parseData } from '../lib/orcamento/index.js';
import { DIAS_CURTOS, MESES, PESSOAS } from '../lib/rotulos.js';

const MEIOS = { cartao: 'cartão', pix: 'pix', debito: 'débito', dinheiro: 'dinheiro' };

/** Lista do mês, filtrável por categoria e pessoa. Tocar num item abre a edição. */
export default function Lancamentos({ ano, mes, orcamento, onMudarMes, onEditar }) {
  const { carregando, erro, categorias, lancamentos } = orcamento;
  const [categoria, setCategoria] = useState('');
  const [pessoa, setPessoa] = useState('');

  const topo = (
    <header className="tela-topo linha-topo">
      <h1>Lançamentos</h1>
      <SeletorMes ano={ano} mes={mes} onChange={onMudarMes} />
    </header>
  );
  if (erro) return <section className="tela">{topo}<p className="erro">Não consegui carregar: {erro}</p></section>;
  if (carregando) return <section className="tela">{topo}<p className="carregando">Carregando…</p></section>;

  const porId = Object.fromEntries(categorias.map((c) => [c.id, c]));
  const filtrados = lancamentos.filter(
    (l) => (!categoria || l.categoria_id === categoria) && (!pessoa || l.pessoa === pessoa),
  );
  const soma = (lista) => lista.reduce((t, l) => t + Number(l.valor), 0);
  const aVista = soma(filtrados.filter(ehAVista));
  const parcelados = soma(filtrados) - aVista;

  const dias = [];
  for (const l of filtrados) {
    if (dias.at(-1)?.data !== l.data) dias.push({ data: l.data, itens: [] });
    dias.at(-1).itens.push(l);
  }

  return (
    <section className="tela">
      {topo}

      <div className="filtros">
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>
          ))}
        </select>
        <div className="segmentado compacto" role="radiogroup" aria-label="Pessoa">
          {[['', 'Todos'], ...Object.entries(PESSOAS)].map(([id, nome]) => (
            <button key={id} role="radio" aria-checked={pessoa === id} className={pessoa === id ? 'ativo' : ''} onClick={() => setPessoa(id)}>
              {nome}
            </button>
          ))}
        </div>
      </div>

      <div className="card resumo-mes">
        <div>
          <span className="rotulo">{filtrados.length} lançamento{filtrados.length === 1 ? '' : 's'}</span>
          <strong>{formatarBRL(aVista)}</strong>
          <span className="sub"> à vista</span>
        </div>
        {parcelados > 0 && (
          <div className="direita">
            <span className="rotulo">Parcelados</span>
            <strong>{formatarBRL(parcelados)}</strong>
            <span className="sub">valor cheio</span>
          </div>
        )}
      </div>

      {dias.length === 0 && <p className="carregando">Nenhum lançamento com esses filtros.</p>}

      {dias.map((d) => {
        const p = parseData(d.data);
        return (
          <div key={d.data} className="grupo-dia">
            <div className="grupo-topo">
              <span>{DIAS_CURTOS[diaDaSemana(p.ano, p.mes, p.dia)]}, {p.dia} {MESES[p.mes - 1]}</span>
              <span>{formatarBRL(soma(d.itens.filter(ehAVista)))}</span>
            </div>
            <ul className="card lista-lanc">
              {d.itens.map((l) => {
                const c = porId[l.categoria_id];
                const n = Number(l.total_parcelas);
                return (
                  <li key={l.id}>
                    <button className="item-lanc" onClick={() => onEditar(l)}>
                      <span className="cat-icone pequeno" style={{ background: `${c?.cor ?? '#999'}22` }}>{c?.icone}</span>
                      <span className="cat-info">
                        <span className="cat-nome">{c?.nome ?? 'Sem categoria'}</span>
                        <span className="cat-sub">
                          {PESSOAS[l.pessoa]}
                          {l.meio && ` · ${MEIOS[l.meio]}`}
                          {l.descricao && ` · ${l.descricao}`}
                        </span>
                      </span>
                      <span className="cat-valor">
                        <strong>{formatarBRL(l.valor)}</strong>
                        <span className="selos">
                          {n > 1 && <span className="selo">{n}x</span>}
                          {l.transacao_cartao_id && <span className="selo ok">conciliado</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
