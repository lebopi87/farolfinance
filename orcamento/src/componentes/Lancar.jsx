import { useEffect, useState } from 'react';
import { inserirLancamento } from '../lib/dados.js';
import { lerValor, formatarBRL } from '../lib/orcamento/index.js';

const PESSOAS = [
  { id: 'leandro', nome: 'Leandro' },
  { id: 'daniele', nome: 'Daniele' },
];
const MEIOS = [
  { id: 'cartao', nome: 'Cartão' },
  { id: 'pix', nome: 'Pix' },
  { id: 'debito', nome: 'Débito' },
  { id: 'dinheiro', nome: 'Dinheiro' },
];
const CHAVE_PESSOA = 'farol.orcamento.pessoa';

const lerPessoaSalva = () => {
  try {
    return localStorage.getItem(CHAVE_PESSOA) || 'leandro';
  } catch {
    return 'leandro';
  }
};

/**
 * Folha de lançamento rápido. Fluxo mínimo: digitar valor → tocar categoria → Salvar.
 * Pessoa fica lembrada no aparelho; meio padrão cartão; parcelas padrão 1.
 */
export default function Lancar({ aberto, categorias, categoriaInicial, hoje, onFechar, onSalvo }) {
  const [valor, setValor] = useState('');
  const [categoriaId, setCategoriaId] = useState(null);
  const [pessoa, setPessoa] = useState(lerPessoaSalva);
  const [meio, setMeio] = useState('cartao');
  const [parcelas, setParcelas] = useState(1);
  const [data, setData] = useState(hoje);
  const [descricao, setDescricao] = useState('');
  const [mais, setMais] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!aberto) return;
    setValor('');
    setCategoriaId(categoriaInicial ?? null);
    setMeio('cartao');
    setParcelas(1);
    setData(hoje);
    setDescricao('');
    setMais(false);
    setErro(null);
  }, [aberto, categoriaInicial, hoje]);

  if (!aberto) return null;

  const numero = lerValor(valor);
  const podeSalvar = numero && categoriaId && !salvando;

  async function salvar(e) {
    e.preventDefault();
    if (!podeSalvar) return;
    setSalvando(true);
    setErro(null);
    try {
      await inserirLancamento({
        data,
        categoria_id: categoriaId,
        valor: numero,
        pessoa,
        meio,
        total_parcelas: parcelas,
        descricao: descricao.trim() || null,
      });
      try {
        localStorage.setItem(CHAVE_PESSOA, pessoa);
      } catch {
        /* sem armazenamento local: só não lembra a pessoa */
      }
      const cat = categorias.find((c) => c.id === categoriaId);
      onSalvo(`${formatarBRL(numero)} em ${cat?.nome ?? 'categoria'}`);
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="sheet-fundo" onClick={onFechar}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={salvar}>
        <div className="sheet-alca" />
        <div className="sheet-topo">
          <h2>Lançar gasto</h2>
          <button type="button" className="btn-texto" onClick={onFechar}>Cancelar</button>
        </div>

        <label className="campo-valor">
          <span>R$</span>
          <input
            // autoFocus no mesmo toque que abre a folha: é o que faz o iOS abrir o teclado.
            autoFocus
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            aria-label="Valor"
          />
        </label>

        <div className="grade-categorias" role="radiogroup" aria-label="Categoria">
          {categorias.map((c) => (
            <button
              type="button"
              key={c.id}
              role="radio"
              aria-checked={categoriaId === c.id}
              className={`chip-categoria ${categoriaId === c.id ? 'ativo' : ''}`}
              style={{ '--cor': c.cor }}
              onClick={() => setCategoriaId(c.id)}
            >
              <span className="chip-icone">{c.icone}</span>
              <span>{c.nome}</span>
            </button>
          ))}
        </div>

        <Segmentado opcoes={PESSOAS} valor={pessoa} onChange={setPessoa} rotulo="Pessoa" />
        <Segmentado opcoes={MEIOS} valor={meio} onChange={setMeio} rotulo="Meio" />

        <div className="linha-parcelas">
          <span className="rotulo">Parcelas</span>
          <div className="stepper">
            <button type="button" onClick={() => setParcelas((p) => Math.max(1, p - 1))} aria-label="Menos parcelas">−</button>
            <strong>{parcelas}x</strong>
            <button type="button" onClick={() => setParcelas((p) => Math.min(24, p + 1))} aria-label="Mais parcelas">+</button>
          </div>
        </div>
        {parcelas > 1 && (
          <p className="aviso">
            Parcelado não conta na categoria: entra na provisão do cartão a partir do mês que vem
            {numero ? ` (${parcelas}x de ${formatarBRL(numero / parcelas)})` : ''}.
          </p>
        )}

        {mais ? (
          <div className="mais-campos">
            <label>
              <span className="rotulo">Data</span>
              <input type="date" value={data} onChange={(e) => setData(e.target.value || hoje)} />
            </label>
            <label>
              <span className="rotulo">Descrição</span>
              <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Opcional" />
            </label>
          </div>
        ) : (
          <button type="button" className="btn-texto" onClick={() => setMais(true)}>
            + data e descrição
          </button>
        )}

        {erro && <p className="erro">{erro}</p>}

        <button type="submit" className="btn-primario" disabled={!podeSalvar}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}

function Segmentado({ opcoes, valor, onChange, rotulo }) {
  return (
    <div className="segmentado" role="radiogroup" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button
          type="button"
          key={o.id}
          role="radio"
          aria-checked={valor === o.id}
          className={valor === o.id ? 'ativo' : ''}
          onClick={() => onChange(o.id)}
        >
          {o.nome}
        </button>
      ))}
    </div>
  );
}
