import { useEffect, useState } from 'react';
import { hojeISO, parseData } from './lib/orcamento/index.js';
import { useOrcamentoMes } from './hooks/useOrcamentoMes.js';
import Hoje from './telas/Hoje.jsx';
import Semana from './telas/Semana.jsx';
import Mes from './telas/Mes.jsx';
import Lancar from './componentes/Lancar.jsx';

const ABAS = [
  { id: 'hoje', nome: 'Hoje', icone: '◎' },
  { id: 'semana', nome: 'Semana', icone: '▦' },
  { id: 'mes', nome: 'Mês', icone: '▤' },
  { id: 'lancamentos', nome: 'Lançamentos', icone: '☰', etapa: 4 },
  { id: 'mais', nome: 'Mais', icone: '⋯', etapa: 4 },
];

// Atualiza "hoje" quando o app volta para a frente (ex.: aberto desde ontem).
function useHoje() {
  const [hoje, setHoje] = useState(hojeISO);
  useEffect(() => {
    const atualizar = () => setHoje(hojeISO());
    document.addEventListener('visibilitychange', atualizar);
    return () => document.removeEventListener('visibilitychange', atualizar);
  }, []);
  return hoje;
}

export default function App() {
  const hoje = useHoje();
  const { ano, mes } = parseData(hoje);
  const orcamento = useOrcamentoMes(ano, mes, hoje);
  // Mês escolhido nas telas Semana e Mês (Hoje é sempre o mês corrente).
  const [sel, setSel] = useState({ ano, mes });
  const orcamentoSel = useOrcamentoMes(sel.ano, sel.mes, hoje);
  const [aba, setAba] = useState('hoje');
  const [lancar, setLancar] = useState({ aberto: false, categoria: null });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const abaAtual = ABAS.find((a) => a.id === aba);

  return (
    <div className="app">
      <main>
        {aba === 'hoje' ? (
          <Hoje hoje={hoje} orcamento={orcamento} onLancar={(categoria) => setLancar({ aberto: true, categoria })} />
        ) : aba === 'semana' ? (
          <Semana key={`${sel.ano}-${sel.mes}`} {...sel} hoje={hoje} orcamento={orcamentoSel} onMudarMes={setSel} />
        ) : aba === 'mes' ? (
          <Mes key={`${sel.ano}-${sel.mes}`} {...sel} orcamento={orcamentoSel} onMudarMes={setSel} />
        ) : (
          <section className="tela">
            <header className="tela-topo"><h1>{abaAtual.nome}</h1></header>
            <p className="carregando">Chega na Etapa {abaAtual.etapa}.</p>
          </section>
        )}
      </main>

      <button className="fab" onClick={() => setLancar({ aberto: true, categoria: null })}>
        + Lançar
      </button>

      <nav className="nav">
        {ABAS.map((a) => (
          <button key={a.id} className={a.id === aba ? 'ativo' : ''} onClick={() => setAba(a.id)}>
            <span className="nav-icone">{a.icone}</span>
            {a.nome}
          </button>
        ))}
      </nav>

      <Lancar
        aberto={lancar.aberto}
        categorias={orcamento.categorias}
        categoriaInicial={lancar.categoria}
        hoje={hoje}
        onFechar={() => setLancar({ aberto: false, categoria: null })}
        onSalvo={(msg) => {
          setLancar({ aberto: false, categoria: null });
          setToast(`Lançado: ${msg}`);
          orcamento.recarregar();
          orcamentoSel.recarregar();
        }}
      />

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
