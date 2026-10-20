import { useEffect, useState } from 'react';
import { hojeISO, parseData } from './lib/orcamento/index.js';
import { useOrcamentoMes } from './hooks/useOrcamentoMes.js';
import Hoje from './telas/Hoje.jsx';
import Semana from './telas/Semana.jsx';
import Mes from './telas/Mes.jsx';
import Lancamentos from './telas/Lancamentos.jsx';
import Parametros from './telas/Parametros.jsx';
import Conciliacao from './telas/Conciliacao.jsx';
import Lancar from './componentes/Lancar.jsx';

const ABAS = [
  { id: 'hoje', nome: 'Hoje', icone: '◎' },
  { id: 'semana', nome: 'Semana', icone: '▦' },
  { id: 'mes', nome: 'Mês', icone: '▤' },
  { id: 'lancamentos', nome: 'Lançamentos', icone: '☰' },
  { id: 'mais', nome: 'Mais', icone: '⋯' },
];

const FECHADO = { aberto: false, categoria: null, lancamento: null, compra: null };

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
  const [lancar, setLancar] = useState(FECHADO);
  const [subMais, setSubMais] = useState('parametros');
  // Muda a cada gravação, para telas com dados próprios (Conciliação) recarregarem.
  const [versao, setVersao] = useState(0);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const recarregarTudo = () => {
    orcamento.recarregar();
    orcamentoSel.recarregar();
    setVersao((v) => v + 1);
  };
  const avisar = (msg) => setToast(msg);

  return (
    <div className="app">
      <main>
        {aba === 'hoje' ? (
          <Hoje hoje={hoje} orcamento={orcamento} onLancar={(categoria) => setLancar({ ...FECHADO, aberto: true, categoria })} />
        ) : aba === 'semana' ? (
          <Semana key={`${sel.ano}-${sel.mes}`} {...sel} hoje={hoje} orcamento={orcamentoSel} onMudarMes={setSel} />
        ) : aba === 'mes' ? (
          <Mes key={`${sel.ano}-${sel.mes}`} {...sel} orcamento={orcamentoSel} onMudarMes={setSel} />
        ) : aba === 'lancamentos' ? (
          <Lancamentos
            {...sel}
            orcamento={orcamentoSel}
            onMudarMes={setSel}
            onEditar={(lancamento) => setLancar({ ...FECHADO, aberto: true, lancamento })}
          />
        ) : (
          <section className="tela">
            <div className="segmentado sub-abas" role="tablist">
              <button role="tab" aria-selected={subMais === 'parametros'} className={subMais === 'parametros' ? 'ativo' : ''} onClick={() => setSubMais('parametros')}>Parâmetros do mês</button>
              <button role="tab" aria-selected={subMais === 'conciliacao'} className={subMais === 'conciliacao' ? 'ativo' : ''} onClick={() => setSubMais('conciliacao')}>Conciliação</button>
            </div>
            {subMais === 'parametros' ? (
              <Parametros
                {...sel}
                orcamento={orcamentoSel}
                onMudarMes={setSel}
                onSalvo={(msg) => {
                  avisar(msg);
                  recarregarTudo();
                }}
              />
            ) : (
              <Conciliacao
                categorias={orcamento.categorias}
                versao={versao}
                onLancarCompra={(compra) => setLancar({ ...FECHADO, aberto: true, compra })}
                onAlterado={(msg) => {
                  avisar(msg);
                  orcamento.recarregar();
                  orcamentoSel.recarregar();
                }}
              />
            )}
          </section>
        )}
      </main>

      {aba !== 'mais' && (
        <button className="fab" onClick={() => setLancar({ ...FECHADO, aberto: true })}>
          + Lançar
        </button>
      )}

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
        lancamento={lancar.lancamento}
        compra={lancar.compra}
        hoje={hoje}
        onFechar={() => setLancar(FECHADO)}
        onSalvo={(msg) => {
          setLancar(FECHADO);
          avisar(msg);
          recarregarTudo();
        }}
      />

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
