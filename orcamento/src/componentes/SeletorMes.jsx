import { somarMeses } from '../lib/orcamento/index.js';
import { MESES_LONGOS } from '../lib/rotulos.js';

export default function SeletorMes({ ano, mes, onChange }) {
  const ir = (n) => onChange(somarMeses(ano, mes, n));
  return (
    <div className="seletor-mes">
      <button onClick={() => ir(-1)} aria-label="Mês anterior">‹</button>
      <span>{MESES_LONGOS[mes - 1]} {ano}</span>
      <button onClick={() => ir(1)} aria-label="Próximo mês">›</button>
    </div>
  );
}
