import { useState } from 'react';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  MapPin, 
  Award
} from 'lucide-react';
import DataSourceBadge from '../components/DataSourceBadge';
import {
  CANDIDATES, 
  VOTING_DATA, 
  COMPARATIVE_YEARS_SUMMARY 
} from '../data/electoralMockData';

export default function Comparison() {
  const [candidate1, setCandidate1] = useState('dr-marcos-silva');
  const [candidate2, setCandidate2] = useState('ana-souza');
  const [candidate3, setCandidate3] = useState('roberto-lima');
  const [compYear, setCompYear] = useState(2024);

  // Get election data for the selected year (defensivo: pode não existir
  // se electoralMockData falhar em popular dynamicVotingData)
  const yearData = VOTING_DATA?.[compYear] || VOTING_DATA?.[2024] || { mayor: [] };
  const mayorList = Array.isArray(yearData.mayor) ? yearData.mayor : [];

  // Helper to compile all candidate comparison data
  const getCandidateData = (candId) => {
    if (!candId) return null;
    if (!Array.isArray(CANDIDATES)) return null;
    const info = CANDIDATES.find(c => c.id === candId);
    if (!info) return null;

    // Find voting details in active year
    const voteDetails = mayorList.find(v => v.candidateId === candId) || { votes: 0, percentage: 0 };
    
    // Find financial summary parameters
    const finSummary = COMPARATIVE_YEARS_SUMMARY[candId] || { spend: {}, leadersCount: {}, costPerVote: {} };
    const spend = finSummary.spend[compYear] || 0;
    const leaders = finSummary.leadersCount[compYear] || 0;
    
    // Calculate cost per vote manually if spend is available
    const calculatedCostPerVote = voteDetails.votes > 0 ? (spend / voteDetails.votes) : 0;

    return {
      ...info,
      votes: voteDetails.votes,
      percentage: voteDetails.percentage,
      spend: spend,
      leaders: leaders,
      costPerVote: calculatedCostPerVote
    };
  };

  const c1Data = getCandidateData(candidate1);
  const c2Data = getCandidateData(candidate2);
  const c3Data = getCandidateData(candidate3);

  const activeCandidates = [c1Data, c2Data, c3Data].filter(Boolean);

  // Identify comparison winners
  const getWinnerBadges = (candId) => {
    if (activeCandidates.length < 2) return [];
    const badges = [];

    // Find who has the highest votes
    const maxVotes = Math.max(...activeCandidates.map(c => c.votes));
    const current = activeCandidates.find(c => c.id === candId);
    
    if (current && current.votes === maxVotes && maxVotes > 0) {
      badges.push({ text: 'Líder de Votos', color: 'var(--accent-green)', bg: 'rgba(0,168,89,0.1)' });
    }

    // Find who is the most economic (lowest cost per vote > 0)
    const validCosts = activeCandidates.map(c => c.costPerVote).filter(c => c > 0);
    if (validCosts.length > 0) {
      const minCost = Math.min(...validCosts);
      if (current && current.costPerVote === minCost) {
        badges.push({ text: 'Mais Econômico', color: 'var(--accent-yellow)', bg: 'rgba(255,204,0,0.1)' });
      }
    }

    // Find who has the highest leaders
    const maxLeaders = Math.max(...activeCandidates.map(c => c.leaders));
    if (current && current.leaders === maxLeaders && maxLeaders > 0) {
      badges.push({ text: 'Maior Mobilização', color: 'var(--accent-blue-bright)', bg: 'rgba(37,99,235,0.1)' });
    }

    return badges;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Configuration Header Bar */}
      <div 
        className="glass" 
        style={{ 
          padding: '1.25rem', 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '1.5rem', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Users size={20} style={{ color: 'var(--accent-blue-bright)' }} />
          <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-title)', fontWeight: 700 }}>
            Configuração da Comparação
          </h3>
          <DataSourceBadge kind="estimate" />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {/* Year selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-gray)', fontWeight: 600, textTransform: 'uppercase' }}>Pleito</span>
            <select 
              value={compYear} 
              onChange={(e) => setCompYear(parseInt(e.target.value))}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              <option value="2024">2024 (Vereador)</option>
              <option value="2022">2022 (Deputado Estadual)</option>
              <option value="2020">2020 (Vereador - Histórico)</option>
            </select>
          </div>

          {/* Candidate 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-gray)', fontWeight: 600, textTransform: 'uppercase' }}>Candidato 1</span>
            <select 
              value={candidate1} 
              onChange={(e) => setCandidate1(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              {CANDIDATES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Candidate 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-gray)', fontWeight: 600, textTransform: 'uppercase' }}>Candidato 2</span>
            <select 
              value={candidate2} 
              onChange={(e) => setCandidate2(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              <option value="">Nenhum</option>
              {CANDIDATES.filter(c => c.id !== candidate1).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Candidate 3 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-gray)', fontWeight: 600, textTransform: 'uppercase' }}>Candidato 3</span>
            <select 
              value={candidate3} 
              onChange={(e) => setCandidate3(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              <option value="">Nenhum</option>
              {CANDIDATES.filter(c => c.id !== candidate1 && c.id !== candidate2).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Candidates Profiles cards */}
      <div 
        className="grid-2-1"
        style={{ alignItems: 'start' }}
      >
        {activeCandidates.map((cand) => {
          const badges = getWinnerBadges(cand.id);

          return (
            <div 
              key={cand.id} 
              className="glass" 
              style={{ 
                padding: '2rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1.25rem',
                borderTop: `4px solid ${cand.color || 'var(--accent-green)'}`,
                background: cand.id === 'dr-marcos-silva' ? 'rgba(7, 31, 19, 0.7)' : 'rgba(255,255,255,0.03)'
              }}
            >
              {/* Header profile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '2.5rem', background: 'rgba(255,255,255,0.05)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {cand.avatar}
                </span>
                <div>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{cand.name}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-gray)' }}>{cand.party} | {cand.role}</span>
                </div>
              </div>

              {/* Dynamic Winner badges */}
              {badges.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {badges.map((b, idx) => (
                    <span 
                      key={idx} 
                      style={{ 
                        fontSize: '0.65rem', 
                        fontWeight: 700, 
                        color: b.color, 
                        background: b.bg, 
                        padding: '4px 10px', 
                        borderRadius: '100px',
                        border: `1px solid ${b.color}33`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Award size={12} /> {b.text}
                    </span>
                  ))}
                </div>
              )}

              {/* Main metrics checklist sheet */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Metric 1: Votação */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-gray)' }}>
                    <TrendingUp size={16} />
                    <span style={{ fontSize: '0.8rem' }}>Votos Obtidos</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: '0.95rem', color: '#FFFFFF', display: 'block' }}>{Number(cand.votes ?? 0).toLocaleString('pt-BR')}</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-gray)' }}>{cand.percentage}%</span>
                  </div>
                </div>

                {/* Metric 2: Orçamento */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-gray)' }}>
                    <DollarSign size={16} />
                    <span style={{ fontSize: '0.8rem' }}>Investimento</span>
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: '#FFFFFF' }}>
                      R$ {Number(cand.spend ?? 0).toLocaleString('pt-BR')}
                    </strong>
                  </div>
                </div>

                {/* Metric 3: Custo por Voto */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-gray)' }}>
                    <DollarSign size={16} style={{ color: 'var(--accent-yellow)' }} />
                    <span style={{ fontSize: '0.8rem' }}>Custo por Voto</span>
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--accent-yellow)' }}>
                      R$ {Number(cand.costPerVote ?? 0).toFixed(2)}
                    </strong>
                  </div>
                </div>

                {/* Metric 4: Lideranças */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-gray)' }}>
                    <MapPin size={16} />
                    <span style={{ fontSize: '0.8rem' }}>Lideranças</span>
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: '#FFFFFF' }}>{cand.leaders}</strong>
                  </div>
                </div>
              </div>

              {/* Graphical Visual Comparison block */}
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-gray)', fontWeight: 600 }}>Custo Eleitoral Relativo</span>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${Math.min((cand.costPerVote / 10) * 100, 100)}%`, 
                      height: '100%', 
                      background: 'linear-gradient(to right, var(--accent-yellow), #EF4444)',
                      borderRadius: '100px'
                    }} 
                  />
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Strategic Analytical Insights footer card */}
      <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-title)', fontWeight: 700 }}>
          Análise Comparativa Geral (Mestre Insight)
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: 'var(--text-gray)' }}>
          <p>
            *   <strong>Eficiência Financeira:</strong> {c1Data && c2Data && c1Data.costPerVote < c2Data.costPerVote ? (
              <span>A campanha de <strong>{c1Data.name}</strong> está rodando de forma mais eficiente (R$ {Number(c1Data.costPerVote ?? 0).toFixed(2)}/voto) comparada à de <strong>{c2Data.name}</strong> (R$ {Number(c2Data.costPerVote ?? 0).toFixed(2)}/voto).</span>
            ) : c2Data ? (
              <span>A campanha de <strong>{c2Data.name}</strong> está gastando menos por voto obtido (R$ {Number(c2Data.costPerVote ?? 0).toFixed(2)}/voto) comparado a <strong>{c1Data?.name}</strong>. Ajuste de alocação de verbas digitais é recomendado.</span>
            ) : 'Selecione mais candidatos para comparar o custo por voto.'}
          </p>
          <p>
            *   <strong>Poder de Mobilização:</strong> {c1Data && c2Data && c1Data.leaders > c2Data.leaders ? (
              <span>Com <strong>{c1Data.leaders}</strong> líderes locais mapeados no CRM, sua campanha lidera o engajamento comunitário frente à oposição, o que garante maior capilaridade de boca a urna no dia da eleição.</span>
            ) : (
              <span>Recomenda-se focar na ativação de novos voluntários nos distritos periféricos para emparelhar com a oposição.</span>
            )}
          </p>
        </div>
      </div>

    </div>
  );
}
