import { useState } from 'react';
import SeletorMes from '../componentes/SeletorMes.jsx';
import { carregarParametrosDoMesAnterior, salvarParametrosMes } from '../lib/dados.js';
import { formatarBRL, formatarNumero, lerMontante, somarMeses } from '../lib/orcamento/index.js';
import { MESES } from '../lib/rotulos.js';

/** Metas por categoria, meta de economia, provisão extra e observação do mês. */
export default function Parametros({ ano, mes, orcamento, onMudarMes, onSalvo }) {
  const { carregando, erro, categorias, parametros } = orcamento;
  return (
    <>
      <header className="tela-topo linha-topo">
        <h1>Parâmetros</h1>
        <SeletorMes ano={ano} mes={mes} onChange={onMudarMes} />
      </header>
      {erro ? (
        <p className="erro">Não consegui carregar: {erro}</p>
      ) : carregando || !parametros ? (
        <p className="carregando">Carregando…</p>
      ) : (
        <Formulario key={`${ano}-${mes}`} ano={ano} mes={mes} categorias={categorias} parametros={parametros} onSalvo={onSalvo} />
      )}
    </>
  );
}

const paraTexto = (v) => formatarNumero(v ?? 0);

function Formulario({ ano, mes, categorias, parametros, onSalvo }) {
  const inicial = () => ({
    metas: Object.fromEntries(categorias.map((c) => [c.id, paraTexto(parametros.metas[c.id])])),
    metaEconomia: paraTexto(parametros.metaEconomia),
    provisaoExtra: paraTexto(parametros.provisaoExtra),
    observacao: parametros.observacao ?? '',
  });
  const [form, setForm] = useState(inicial);
  const [alterado, setAlterado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [erro, setErro] = useState(null);

  const mudar = (fn) => {
    setForm((f) => fn(structuredClone(f)));
    setAlterado(true);
    setAviso(null);
  };

  const metas = Object.fromEntries(Object.entries(form.metas).map(([id, t]) => [id, lerMontante(t)]));
  const metaEconomia = lerMontante(form.metaEconomia);
  const provisaoExtra = lerMontante(form.provisaoExtra);
  const invalido = Object.values(metas).some((v) => v === null) || metaEconomia === null || provisaoExtra === null;
  const somaMetas = Object.values(metas).reduce((t, v) => t + (v ?? 0), 0);

  async function copiarAnterior() {
    setErro(null);
    try {
      const ant = await carregarParametrosDoMesAnterior(ano, mes, categorias);
      mudar((f) => {
        for (const c of categorias) f.metas[c.id] = paraTexto(ant.metas[c.id]);
        f.metaEconomia = paraTexto(ant.metaEconomia);
        return f;
      });
      const a = somarMeses(ano, mes, -1);
      setAviso(`Metas e economia copiadas de ${MESES[a.mes - 1]}/${a.ano}. Toque em Salvar para gravar.`);
    } catch (e) {
      setErro(e.message);
    }
  }

  async function salvar(e) {
    e.preventDefault();
    if (invalido || !alterado) return;
    setSalvando(true);
    setErro(null);
    try {
      await salvarParametrosMes(ano, mes, { metas, metaEconomia, provisaoExtra, observacao: form.observacao.trim() });
      setAlterado(false);
      onSalvo(`Parâmetros de ${MESES[mes - 1]}/${ano} salvos`);
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="form-parametros">
      <button type="button" className="btn-secundario" onClick={copiarAnterior}>
        ⟲ Copiar do mês anterior
      </button>
      {aviso && <p className="aviso">{aviso}</p>}

      <h2 className="titulo-secao">Metas por categoria</h2>
      <div className="card linhas">
        {categorias.map((c) => (
          <label key={c.id} className="linha campo-linha">
            <span>{c.icone} {c.nome}</span>
            <Campo valor={form.metas[c.id]} invalido={metas[c.id] === null} onChange={(v) => mudar((f) => ((f.metas[c.id] = v), f))} />
          </label>
        ))}
        <div className="linha total">
          <span>Total</span>
          <strong>{formatarBRL(somaMetas)}</strong>
        </div>
      </div>

      <h2 className="titulo-secao">Mês</h2>
      <div className="card linhas">
        <label className="linha campo-linha">
          <span>Meta de economia</span>
          <Campo valor={form.metaEconomia} invalido={metaEconomia === null} onChange={(v) => mudar((f) => ((f.metaEconomia = v), f))} />
        </label>
        <label className="linha campo-linha">
          <span>Provisão extra<small className="sub bloco-sub">soma na provisão do cartão</small></span>
          <Campo valor={form.provisaoExtra} invalido={provisaoExtra === null} onChange={(v) => mudar((f) => ((f.provisaoExtra = v), f))} />
        </label>
        <label className="linha campo-coluna">
          <span>Observação</span>
          <input value={form.observacao} onChange={(e) => mudar((f) => ((f.observacao = e.target.value), f))} placeholder="Opcional" />
        </label>
      </div>

      {erro && <p className="erro">{erro}</p>}
      <button type="submit" className="btn-primario salvar-parametros" disabled={invalido || !alterado || salvando}>
        {salvando ? 'Salvando…' : alterado ? 'Salvar' : 'Salvo'}
      </button>
    </form>
  );
}

function Campo({ valor, invalido, onChange }) {
  return (
    <span className={`campo-moeda ${invalido ? 'invalido' : ''}`}>
      <span>R$</span>
      <input inputMode="decimal" value={valor} onChange={(e) => onChange(e.target.value)} onFocus={(e) => e.target.select()} />
    </span>
  );
}
