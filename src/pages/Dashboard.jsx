import { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  MapPin,
  CheckSquare,
  Clock,
  ArrowUpRight,
  Target,
  Trophy,
  Vote,
  Award,
  RefreshCw
} from 'lucide-react';
import { CANDIDATES } from '../data/electoralMockData';
import DataSourceBadge from '../components/DataSourceBadge';

export default function Dashboard({ activeCandidate, candidates, contacts = [], tasks, setTasks, setActivePage }) {
  // Candidato vem da lista REAL (configurada); mock só como último fallback.
  const candidate =
    (candidates && candidates.find((c) => c.id === activeCandidate)) ||
    (candidates && candidates[0]) ||
    CANDIDATES.find((c) => c.id === activeCandidate) ||
    CANDIDATES[0];

  // Indicadores de campanha DERIVADOS dos dados reais do CRM (contacts).
  // Numa campanha recém-configurada começam zerados e crescem conforme o uso —
  // sem números ilustrativos fixos.
  const baseMapeada = contacts.length;
  const lideresCount = contacts.filter((c) => (c.role || '').toLowerCase().includes('lider')).length;
  const ativosCount = contacts.filter((c) => (c.status || '').toLowerCase() === 'ativo').length;
  const activeRatio = baseMapeada ? Math.round((ativosCount / baseMapeada) * 1000) / 10 : 0;
  const regionsCovered = new Set(contacts.map((c) => c.regionId).filter(Boolean)).size;

  // Meta da base: alvo derivado dos dados oficiais do TSE do candidato.
  const targetGoal = candidate.targetGoal || 0;

  // Calculate goal percentage (sobre a base REAL)
  const goalPercentage = targetGoal ? Math.min(Math.round((baseMapeada / targetGoal) * 100), 100) : 0;

  // Toggle tasks check/uncheck
  const toggleTask = (taskId) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: !t.done } : t));
    // Trigger confetti on completion if canvas-confetti is available
    import('canvas-confetti').then((confetti) => {
      confetti.default({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#00A859', '#FFCC00', '#2563EB']
      });
    }).catch(() => {});
  };

  // Evolução real: sem histórico ilustrativo. Antes do uso a base é 0; o ponto
  // atual reflete os apoiadores efetivamente cadastrados no CRM.
  const growthData = [0, 0, 0, 0, 0, baseMapeada];
  const months = ['Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai'];
  const hasBase = baseMapeada > 0;

  // SVG Chart calculation parameters
  const chartHeight = 100;
  const chartWidth = 500;
  const maxVal = Math.max(...growthData, 10);
  const points = growthData.map((val, idx) => {
    const x = (idx / (growthData.length - 1)) * chartWidth;
    const y = chartHeight - (val / maxVal) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Banner com KPIs REAIS do TSE (dados oficiais) */}
      <RealApuracaoBanner setActivePage={setActivePage} />

      {/* Welcome Banner */}
      <div 
        className="glass" 
        style={{ 
          padding: '1.5rem 2rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderLeft: '4px solid var(--accent-green-bright)' 
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-title)', fontWeight: 800 }}>
            Olá, Comandante da Campanha! 🇧🇷
          </h1>
          <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', marginTop: '4px' }}>
            Aqui está o diagnóstico atualizado para <strong style={{ color: 'var(--text-white)' }}>{candidate.name} ({candidate.party})</strong>.
          </p>
        </div>
        <div style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 0 10px rgba(20,30,60,0.15))' }} className="animate-float">
          📈
        </div>
      </div>

      {/* Rótulo de procedência dos cards ilustrativos abaixo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '-0.5rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-gray)', fontWeight: 600 }}>
          Indicadores de campanha
        </span>
        <DataSourceBadge kind="demo" />
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem'
        }}
      >
        {/* KPI 1: Base de Apoio */}
        <div className="glass" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ background: 'rgba(0, 168, 89, 0.1)', padding: '12px', borderRadius: 'var(--radius-sm)', color: 'var(--accent-green-bright)' }}>
            <Users size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-gray)', textTransform: 'uppercase', fontWeight: 600 }}>Base Mapeada</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px' }}>{baseMapeada.toLocaleString()}</h3>
            <span style={{ fontSize: '0.65rem', color: 'var(--accent-green-bright)', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 600, marginTop: '2px' }}>
              <TrendingUp size={12} /> {hasBase ? 'Cadastrados no CRM' : 'Cadastre apoiadores no CRM'}
            </span>
          </div>
        </div>

        {/* KPI 2: Meta Eleitoral */}
        <div className="glass" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ background: 'rgba(255, 204, 0, 0.1)', padding: '12px', borderRadius: 'var(--radius-sm)', color: 'var(--accent-yellow)' }}>
            <Target size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-gray)', textTransform: 'uppercase', fontWeight: 600 }}>Meta da Base</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px' }}>{targetGoal.toLocaleString()}</h3>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-gray)', fontWeight: 500, marginTop: '2px', display: 'inline-block' }}>
              {targetGoal ? `Faltam ${Math.max(targetGoal - baseMapeada, 0).toLocaleString()} contatos` : 'Defina sua campanha'}
            </span>
          </div>
        </div>

        {/* KPI 3: Lideranças Cadastradas */}
        <div className="glass" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ background: 'rgba(37, 99, 235, 0.1)', padding: '12px', borderRadius: 'var(--radius-sm)', color: 'var(--accent-blue-bright)' }}>
            <MapPin size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-gray)', textTransform: 'uppercase', fontWeight: 600 }}>Lideranças</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px' }}>{lideresCount}</h3>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-gray)', fontWeight: 500, marginTop: '2px', display: 'inline-block' }}>
              {regionsCovered > 0 ? `Cobrindo ${regionsCovered} região(ões)` : 'Nenhuma liderança ainda'}
            </span>
          </div>
        </div>

        {/* KPI 4: Taxa de Engajamento */}
        <div className="glass" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ background: 'rgba(20, 30, 60, 0.05)', padding: '12px', borderRadius: 'var(--radius-sm)', color: '#FFFFFF' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-gray)', textTransform: 'uppercase', fontWeight: 600 }}>Taxa de Atividade</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px' }}>{hasBase ? `${activeRatio}%` : '—'}</h3>
            <span style={{ fontSize: '0.65rem', color: 'var(--accent-green-bright)', fontWeight: 600, marginTop: '2px', display: 'inline-block' }}>
              {hasBase ? `${ativosCount} de ${baseMapeada} ativos` : 'Sem base cadastrada'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid Widgets */}
      <div 
        className="grid-2-1"
        style={{ alignItems: 'start' }}
      >
        
        {/* Left Column: Growth Chart & Action Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Support Growth Chart */}
          <div className="glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-title)', fontWeight: 700 }}>
                  Evolução Mensal da Base
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-gray)' }}>Histórico acumulado de apoiadores cadastrados no CRM</p>
              </div>
              <button 
                onClick={() => setActivePage('crm')}
                style={{ 
                  background: 'rgba(0, 168, 89, 0.1)', 
                  border: '1px solid rgba(0, 168, 89, 0.2)',
                  color: 'var(--accent-green-bright)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Ver CRM <ArrowUpRight size={12} />
              </button>
            </div>

            {/* Custom SVG Line Chart */}
            <div style={{ width: '100%', marginTop: '1.5rem' }}>
              <svg 
                viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                style={{ width: '100%', height: '180px', overflow: 'visible' }}
              >
                {/* Grid Lines */}
                <line x1="0" y1="0" x2={chartWidth} y2="0" stroke="rgba(20,30,60,0.05)" strokeWidth="1" />
                <line x1="0" y1="33" x2={chartWidth} y2="33" stroke="rgba(20,30,60,0.05)" strokeWidth="1" />
                <line x1="0" y1="66" x2={chartWidth} y2="66" stroke="rgba(20,30,60,0.05)" strokeWidth="1" />
                <line x1="0" y1="100" x2={chartWidth} y2="100" stroke="rgba(20,30,60,0.1)" strokeWidth="1.5" />

                {/* Line Path Area (Green glow fill) */}
                <path
                  d={`M0,${chartHeight} L${points} L${chartWidth},${chartHeight} Z`}
                  fill="url(#greenGlowGrad)"
                />

                {/* Chart Line Path */}
                <path
                  d={`M${points}`}
                  fill="none"
                  stroke="var(--accent-green-bright)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Node Circles */}
                {growthData.map((val, idx) => {
                  const x = (idx / (growthData.length - 1)) * chartWidth;
                  const y = chartHeight - (val / maxVal) * chartHeight;
                  return (
                    <g key={idx} className="chart-node">
                      <circle cx={x} cy={y} r="6" fill="#FFFFFF" stroke="var(--accent-green-bright)" strokeWidth="3" />
                      <text 
                        x={x} 
                        y={y - 12} 
                        textAnchor="middle" 
                        fill="var(--text-white)" 
                        fontSize="9" 
                        fontWeight="700"
                        style={{ fontFamily: 'var(--font-sans)' }}
                      >
                        {val.toLocaleString()}
                      </text>
                    </g>
                  );
                })}

                {/* Gradients */}
                <defs>
                  <linearGradient id="greenGlowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-green-bright)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--accent-green-bright)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Month Labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px', marginTop: '10px' }}>
                {months.map((m, idx) => (
                  <span key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-gray)', fontWeight: 500 }}>{m}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Action Checklist Tasks */}
          <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckSquare size={20} style={{ color: 'var(--accent-yellow)' }} />
              <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-title)', fontWeight: 700 }}>
                Tarefas Recomendadas
              </h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '0.5rem' }}>
              {tasks.slice(0, 4).map((task) => (
                <div 
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: task.done ? 'rgba(20,30,60,0.01)' : 'rgba(20,30,60,0.02)',
                    border: '1px solid rgba(20,30,60,0.05)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    opacity: task.done ? 0.6 : 1,
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(20,30,60,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(20,30,60,0.05)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input 
                      type="checkbox" 
                      checked={task.done} 
                      readOnly 
                      style={{ cursor: 'pointer' }}
                    />
                    <span 
                      style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: 500,
                        textDecoration: task.done ? 'line-through' : 'none',
                        color: task.done ? 'var(--text-muted)' : 'var(--text-white)',
                      }}
                    >
                      {task.text}
                    </span>
                  </div>
                  
                  {/* Priority Badge */}
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '100px',
                      background: 
                        task.category === 'alta' ? 'rgba(239, 68, 68, 0.15)' : 
                        task.category === 'media' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                      color: 
                        task.category === 'alta' ? '#EF4444' : 
                        task.category === 'media' ? '#F59E0B' : '#9CA3AF',
                      border: 
                        task.category === 'alta' ? '1px solid rgba(239, 68, 68, 0.2)' : 
                        task.category === 'media' ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(107, 114, 128, 0.2)',
                    }}
                  >
                    {task.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Goal gauge & Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Progressive Goal Gauge */}
          <div className="glass flex-center" style={{ padding: '2rem', flexDirection: 'column', position: 'relative' }}>
            <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-title)', fontWeight: 700, marginBottom: '1.5rem', alignSelf: 'flex-start' }}>
              Alvo Eleitoral
            </h3>

            {/* Dial Arc representation */}
            <div style={{ position: 'relative', width: '180px', height: '180px' }} className="flex-center">
              <svg width="100%" height="100%" viewBox="0 0 100 100">
                {/* Background Arc */}
                <path
                  d="M20,80 A40,40 0 1,1 80,80"
                  fill="none"
                  stroke="rgba(20,30,60,0.05)"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                
                {/* Progressive Colorful Arc (Brazilian flag theme) */}
                <path
                  d="M20,80 A40,40 0 1,1 80,80"
                  fill="none"
                  stroke="url(#dialBrasilGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="188.5"
                  strokeDashoffset={188.5 - (188.5 * goalPercentage * 0.75) / 100} // 75% represents the arc ratio
                  style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                />
              </svg>

              {/* Text inside Dial */}
              <div 
                style={{ 
                  position: 'absolute', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  transform: 'translateY(-10px)'
                }}
              >
                <span style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-title)' }}>
                  {goalPercentage}%
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-gray)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '-4px' }}>
                  Concluído
                </span>
              </div>
            </div>

            {/* Gradient definition for Dial */}
            <svg width="0" height="0">
              <defs>
                <linearGradient id="dialBrasilGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--accent-blue)" />
                  <stop offset="50%" stopColor="var(--accent-yellow)" />
                  <stop offset="100%" stopColor="var(--accent-green-bright)" />
                </linearGradient>
              </defs>
            </svg>

            {/* Target text descriptions */}
            <div style={{ width: '100%', borderTop: '1px solid var(--border-color)', marginTop: '1.25rem', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-gray)', display: 'block', fontWeight: 500 }}>Objetivo</span>
                <strong style={{ fontSize: '1rem', fontWeight: 700 }}>{targetGoal.toLocaleString()}</strong>
              </div>
              <div style={{ borderLeft: '1px solid var(--border-color)' }}></div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-gray)', display: 'block', fontWeight: 500 }}>Alcance Atual</span>
                <strong style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-green-bright)' }}>{baseMapeada.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          {/* Recent Timeline activity logs */}
          <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} style={{ color: 'var(--accent-blue-bright)' }} />
              <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-title)', fontWeight: 700 }}>
                Linha de Atividades
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', paddingLeft: '20px', marginTop: '0.5rem' }}>
              {/* Vertical timeline line */}
              <div 
                style={{ 
                  position: 'absolute', 
                  left: '6px', 
                  top: '5px', 
                  bottom: '15px', 
                  width: '2px', 
                  background: 'rgba(20,30,60,0.06)' 
                }} 
              />

              {/* Activity 1 */}
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-20px', top: '3px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-green)', border: '2px solid var(--dot-border)' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 500 }}>Recentemente</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-white)' }}>Reunião Geral em Vila Nova</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-gray)', marginTop: '2px' }}>Nova liderança cadastrou 85 apoiadores locais.</p>
              </div>

              {/* Activity 2 */}
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-20px', top: '3px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-blue-bright)', border: '2px solid var(--dot-border)' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 500 }}>Há 2 dias</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-white)' }}>Atualização de Dados do TSE</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-gray)', marginTop: '2px' }}>Histórico eleitoral consolidado do pleito de 2024 importado.</p>
              </div>

              {/* Activity 3 */}
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-20px', top: '3px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-yellow)', border: '2px solid var(--dot-border)' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 500 }}>Há 4 dias</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-white)' }}>Simulação de IA Concluída</span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-gray)', marginTop: '2px' }}>IA Mestre traçou plano de marketing para bairro estratégico.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// =========================================================================
// RealApuracaoBanner — KPIs com dados oficiais TSE via /api/tse-apuracao.
// Mostra: posição do candidato (fuzzy match pelo campaign_params), votos,
// % dos válidos, agregados do município. Renderiza apenas se houver match.
// =========================================================================
function RealApuracaoBanner({ setActivePage }) {
  const params = (() => {
    try {
      return typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('campaignParams') || 'null')
        : null;
    } catch {
      return null;
    }
  })();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const city = params?.city || '';
  const role = params?.role || '';
  const candidateHint = params?.candidateName || '';

  // NEMESIS3: cargos estaduais+ (DE/DF/SF/GV) NÃO têm apuração municipal de 2024 —
  // são pleito 2026 que ainda não ocorreu. Não chamar /api/tse-apuracao p/ eles.
  const isMunicipalCargo = ['Prefeito', 'Vereador'].includes(role);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isMunicipalCargo || !city || !role) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = `/api/tse-apuracao?city=${encodeURIComponent(city)}&role=${role}&year=2024`;
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success) throw new Error(json.error || 'Erro');
        setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [city, role, isMunicipalCargo]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Loading / erro / sem setup
  if (!role || !params?.candidateName) {
    return (
      <div className="glass" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-yellow)' }}>
        <strong>Configure sua campanha</strong>
        <p style={{ color: 'var(--text-gray)', fontSize: '0.85rem', marginTop: '4px' }}>
          Complete o ajuste de campanha (nome, cargo, partido, UF) para ver os dados oficiais.
        </p>
      </div>
    );
  }

  // Cargos estaduais+: pleito 2026 ainda não ocorreu. Não buscar apuração municipal.
  if (!isMunicipalCargo) {
    return (
      <div className="glass" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-blue-bright)' }}>
        <strong>Candidatura 2026: {params.candidateName} · {role}/{params.state || 'BR'}</strong>
        <p style={{ color: 'var(--text-gray)', fontSize: '0.85rem', marginTop: '6px', lineHeight: 1.5 }}>
          A eleição geral de 2026 ocorre em <strong>outubro/2026</strong>. Ainda não há apuração oficial para cruzar.
          Para a projeção do <strong>coeficiente eleitoral</strong> (votos válidos esperados, QE, voto individual mínimo,
          cláusula partidária), vá em <strong>Apuração TSE → aba Coeficiente</strong>. Para análise estratégica com IA
          a partir de notícias e dados oficiais, use <strong>Consultoria IA</strong> ou <strong>Plano Tático</strong>.
        </p>
        <button
          onClick={() => setActivePage('apuracao-tse')}
          style={{
            background: 'rgba(0,168,89,0.1)', border: '1px solid rgba(0,168,89,0.2)',
            color: 'var(--accent-green-bright)', padding: '6px 12px',
            borderRadius: 'var(--radius-sm)', fontSize: '0.75rem',
            cursor: 'pointer', fontWeight: 600, marginTop: '8px'
          }}
        >
          Ver Coeficiente Eleitoral →
        </button>
      </div>
    );
  }

  if (!city) {
    return (
      <div className="glass" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-yellow)' }}>
        <strong>Defina o município</strong>
        <p style={{ color: 'var(--text-gray)', fontSize: '0.85rem', marginTop: '4px' }}>
          Para {role}, o município é obrigatório no setup.
        </p>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="glass" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ color: 'var(--text-gray)' }}>Carregando apuração oficial de {city}…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="glass" style={{ padding: '1.25rem', borderLeft: '4px solid #EF4444' }}>
        <strong>Não foi possível carregar a apuração</strong>
        <p style={{ color: 'var(--text-gray)', fontSize: '0.85rem', marginTop: '4px' }}>{error}</p>
      </div>
    );
  }
  if (!data) return null;

  // Match do candidato do usuário na lista (fuzzy)
  const candidate = (() => {
    if (!candidateHint || !data.candidates) return null;
    const target = candidateHint.toUpperCase();
    return data.candidates.find(
      (c) =>
        c.candidate_urn_name?.toUpperCase().includes(target) ||
        c.candidate_name?.toUpperCase().includes(target)
    );
  })();

  const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('pt-BR'));
  const fmtPct = (n) => (n == null ? '—' : `${Number(n).toFixed(2).replace('.', ',')}%`);

  return (
    <div
      className="glass"
      style={{
        padding: '1.5rem',
        borderLeft: '4px solid var(--accent-green-bright)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            Apuração oficial TSE · {data.municipality?.name} · {data.role?.name}
            <DataSourceBadge kind="official" />
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-gray)', margin: '4px 0 0' }}>
            {data.candidates?.length || 0} candidatos · {data.aggregate?.pctSectionsCounted}% das seções apuradas
          </p>
        </div>
        <button
          onClick={() => setActivePage('apuracao-tse')}
          style={{
            background: 'rgba(0, 168, 89, 0.1)',
            border: '1px solid rgba(0, 168, 89, 0.2)',
            color: 'var(--accent-green-bright)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 600
          }}
        >
          Ver apuração completa <ArrowUpRight size={12} />
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem'
        }}
      >
        {candidate ? (
          <>
            <KPI icon={<Trophy size={18} />} label="Sua colocação" value={`${candidate.candidate_seq ?? '—'}º`} color="var(--accent-green-bright)" />
            <KPI icon={<Vote size={18} />} label="Seus votos" value={fmt(candidate.candidate_votes)} color="#FFFFFF" />
            <KPI icon={<Award size={18} />} label="% dos válidos" value={fmtPct(candidate.candidate_percentage)} color="var(--accent-blue-bright)" />
            <KPI icon={<Target size={18} />} label="Resultado" value={candidate.candidate_is_elected ? 'ELEITO' : 'NÃO ELEITO'} color={candidate.candidate_is_elected ? 'var(--accent-green-bright)' : 'var(--text-gray)'} />
          </>
        ) : (
          <>
            <KPI icon={<Users size={18} />} label="Eleitorado" value={fmt(data.aggregate?.totalVoters)} color="#FFFFFF" />
            <KPI icon={<TrendingUp size={18} />} label="Comparecimento" value={`${fmt(data.aggregate?.totalPresent)} (${fmtPct(data.aggregate?.pctPresent)})`} color="var(--accent-blue-bright)" />
            <KPI icon={<Vote size={18} />} label="Seções apuradas" value={`${data.aggregate?.sectionsCounted}/${data.aggregate?.sectionsTotal}`} color="#FFFFFF" />
            <KPI icon={<Target size={18} />} label="Vagas em disputa" value={fmt(data.role?.seats)} color="var(--accent-yellow)" />
          </>
        )}
      </div>

      {!candidate && candidateHint && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-gray)', margin: 0 }}>
          ⚠️ Não localizamos <strong>{candidateHint}</strong> na lista oficial de {data.role?.name} de {data.municipality?.name}/2024. Ajuste o nome no setup ou veja a lista completa em <strong>Apuração TSE</strong>.
        </p>
      )}
    </div>
  );
}

function KPI({ icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
      <div
        style={{
          background: 'rgba(20,30,60,0.04)',
          padding: '10px',
          borderRadius: 'var(--radius-sm)',
          color: color || 'var(--accent-green-bright)'
        }}
      >
        {icon}
      </div>
      <div>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-gray)', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '2px', color: color || 'var(--text-white)' }}>{value}</h3>
      </div>
    </div>
  );
}
