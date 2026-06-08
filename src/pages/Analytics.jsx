import { useState } from 'react';
import { 
  Filter, 
  Map,
  Building2
} from 'lucide-react';
import { 
  CANDIDATES, 
  YEARS, 
  REGIONS, 
  ZONES, 
  VOTING_DATA, 
  SECTIONS_MOCK 
} from '../data/electoralMockData';

export default function Analytics({ activeCandidate }) {
  const campaignParams = (() => { try { return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('campaignParams')) : null; } catch { return null; } })();
  const cityName = campaignParams?.city || 'sua cidade';

  const [selectedYear, setSelectedYear] = useState(2024);
  const [selectedCargo, setSelectedCargo] = useState('Prefeito');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedZone, setSelectedZone] = useState('all');
  const [hoveredRegion, setHoveredRegion] = useState(null);

  // Find candidate details

  // Helper: Get voting data based on selected filters
  const getFilteredVotingData = () => {
    const yearData = VOTING_DATA[selectedYear];
    if (!yearData) return [];

    let results;

    // Filter by Region or Zone
    if (selectedRegion !== 'all') {
      results = yearData.byRegion[selectedRegion] || [];
    } else if (selectedZone !== 'all') {
      results = yearData.byZone[selectedZone] || [];
    } else {
      results = yearData.mayor || []; // overall mayor data
    }

    // Map candidate info to voting data
    return results.map(item => {
      const candidateInfo = CANDIDATES.find(c => c.id === item.candidateId) || {};
      return {
        ...item,
        name: candidateInfo.name || "Candidato Opositor",
        party: candidateInfo.party || "Oposição",
        avatar: candidateInfo.avatar || "👤",
        isTarget: item.candidateId === activeCandidate
      };
    }).sort((a, b) => b.votes - a.votes);
  };

  const currentVotes = getFilteredVotingData();
  // Calculate total votes represented
  const totalVotesCount = currentVotes.reduce((acc, curr) => acc + curr.votes, 0);

  // Get active section list based on selected zone
  const getSectionsList = () => {
    if (selectedZone !== 'all') {
      return SECTIONS_MOCK[selectedZone] || [];
    }
    // Fallback merge all sections
    return Object.values(SECTIONS_MOCK).flat().slice(0, 8);
  };
  
  const sections = getSectionsList();

  // Handle map region click
  const handleRegionClick = (regionId) => {
    if (selectedRegion === regionId) {
      setSelectedRegion('all'); // toggle off
    } else {
      setSelectedRegion(regionId);
      setSelectedZone('all'); // disable conflicting filter
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Controls Header */}
      <div 
        className="glass" 
        style={{ 
          padding: '1.25rem', 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '1rem', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Filter size={18} style={{ color: 'var(--accent-green-bright)' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Filtros de Pesquisa</h3>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {/* Select Year */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-gray)', fontWeight: 600, textTransform: 'uppercase' }}>Ano do Pleito</span>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Select Cargo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-gray)', fontWeight: 600, textTransform: 'uppercase' }}>Cargo</span>
            <select 
              value={selectedCargo} 
              onChange={(e) => setSelectedCargo(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              <option value="Prefeito">Prefeito</option>
              <option value="Vereador">Vereador</option>
            </select>
          </div>

          {/* Select Zone */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-gray)', fontWeight: 600, textTransform: 'uppercase' }}>Zona Eleitoral</span>
            <select 
              value={selectedZone} 
              onChange={(e) => {
                setSelectedZone(e.target.value);
                setSelectedRegion('all'); // reset region
              }}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              <option value="all">Todas as Zonas</option>
              {ZONES.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>

          {/* Select Region */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-gray)', fontWeight: 600, textTransform: 'uppercase' }}>Bairro / Região</span>
            <select 
              value={selectedRegion} 
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setSelectedZone('all'); // reset zone
              }}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              <option value="all">Todos os Bairros</option>
              {REGIONS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div 
        className="grid-2-1"
        style={{ alignItems: 'start' }}
      >
        
        {/* Left Widget: Interactive SVG Map */}
        <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '350px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Map size={20} style={{ color: 'var(--accent-green-bright)' }} />
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-title)', fontWeight: 700 }}>
                Mapa Temático de Votação
              </h3>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-gray)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
              {cityName}
            </span>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-gray)' }}>
            Clique em um bairro para filtrar os dados eleitorais. A tonalidade indica a força do seu candidato na região.
          </p>

          {/* Interactive Vector Grid SVG Map */}
          <div 
            style={{ 
              position: 'relative', 
              width: '100%', 
              height: '280px', 
              background: 'rgba(0,0,0,0.2)', 
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.04)'
            }}
          >
            {/* SVG Interactive Regions */}
            <svg viewBox="0 0 400 300" style={{ width: '90%', height: '90%', overflow: 'visible' }}>
              {/* Region 1: Vila Nova (Top Left) */}
              <path
                d="M30 40 L160 30 L130 130 L40 100 Z"
                fill={selectedRegion === 'vila-nova' ? 'rgba(0, 168, 89, 0.45)' : 'rgba(0, 168, 89, 0.25)'}
                stroke={selectedRegion === 'vila-nova' ? 'var(--accent-green-bright)' : 'rgba(0, 168, 89, 0.4)'}
                strokeWidth={selectedRegion === 'vila-nova' ? '3' : '1.5'}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={() => handleRegionClick('vila-nova')}
                onMouseEnter={() => setHoveredRegion('vila-nova')}
                onMouseLeave={() => setHoveredRegion(null)}
              />

              {/* Region 2: Centro (Center) */}
              <path
                d="M160 30 L260 50 L220 180 L130 130 Z"
                fill={selectedRegion === 'centro' ? 'rgba(0, 168, 89, 0.4)' : 'rgba(0, 168, 89, 0.2)'}
                stroke={selectedRegion === 'centro' ? 'var(--accent-green-bright)' : 'rgba(0, 168, 89, 0.3)'}
                strokeWidth={selectedRegion === 'centro' ? '3' : '1.5'}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={() => handleRegionClick('centro')}
                onMouseEnter={() => setHoveredRegion('centro')}
                onMouseLeave={() => setHoveredRegion(null)}
              />

              {/* Region 3: Jardins (Top Right) */}
              <path
                d="M260 50 L370 40 L350 140 L220 180 Z"
                fill={selectedRegion === 'jardins' ? 'rgba(37, 99, 235, 0.35)' : 'rgba(37, 99, 235, 0.15)'} // Strong competitor area
                stroke={selectedRegion === 'jardins' ? 'var(--accent-blue-bright)' : 'rgba(37, 99, 235, 0.3)'}
                strokeWidth={selectedRegion === 'jardins' ? '3' : '1.5'}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={() => handleRegionClick('jardins')}
                onMouseEnter={() => setHoveredRegion('jardins')}
                onMouseLeave={() => setHoveredRegion(null)}
              />

              {/* Region 4: Floresta (Bottom Left) */}
              <path
                d="M40 100 L130 130 L110 260 L20 220 Z"
                fill={selectedRegion === 'floresta' ? 'rgba(0, 168, 89, 0.3)' : 'rgba(0, 168, 89, 0.15)'}
                stroke={selectedRegion === 'floresta' ? 'var(--accent-green-bright)' : 'rgba(0, 168, 89, 0.3)'}
                strokeWidth={selectedRegion === 'floresta' ? '3' : '1.5'}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={() => handleRegionClick('floresta')}
                onMouseEnter={() => setHoveredRegion('floresta')}
                onMouseLeave={() => setHoveredRegion(null)}
              />

              {/* Region 5: Industrial (Bottom Center) */}
              <path
                d="M130 130 L220 180 L280 270 L110 260 Z"
                fill={selectedRegion === 'industrial' ? 'rgba(0, 168, 89, 0.35)' : 'rgba(0, 168, 89, 0.2)'}
                stroke={selectedRegion === 'industrial' ? 'var(--accent-green-bright)' : 'rgba(0, 168, 89, 0.3)'}
                strokeWidth={selectedRegion === 'industrial' ? '3' : '1.5'}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={() => handleRegionClick('industrial')}
                onMouseEnter={() => setHoveredRegion('industrial')}
                onMouseLeave={() => setHoveredRegion(null)}
              />

              {/* Region 6: Morada do Sol (Bottom Right) */}
              <path
                d="M220 180 L350 140 L380 240 L280 270 Z"
                fill={selectedRegion === 'morada-sol' ? 'rgba(0, 168, 89, 0.45)' : 'rgba(0, 168, 89, 0.25)'}
                stroke={selectedRegion === 'morada-sol' ? 'var(--accent-green-bright)' : 'rgba(0, 168, 89, 0.4)'}
                strokeWidth={selectedRegion === 'morada-sol' ? '3' : '1.5'}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={() => handleRegionClick('morada-sol')}
                onMouseEnter={() => setHoveredRegion('morada-sol')}
                onMouseLeave={() => setHoveredRegion(null)}
              />

              {/* Text Labels inside SVGs */}
              <text x="75" y="75" fill="#FFF" fontSize="10" fontWeight="bold" textAnchor="middle" pointerEvents="none">Vila Nova</text>
              <text x="180" y="100" fill="#FFF" fontSize="10" fontWeight="bold" textAnchor="middle" pointerEvents="none">Centro</text>
              <text x="290" y="110" fill="#FFF" fontSize="10" fontWeight="bold" textAnchor="middle" pointerEvents="none">Jardins</text>
              <text x="75" y="190" fill="#FFF" fontSize="10" fontWeight="bold" textAnchor="middle" pointerEvents="none">Floresta</text>
              <text x="180" y="210" fill="#FFF" fontSize="10" fontWeight="bold" textAnchor="middle" pointerEvents="none">Dist. Industrial</text>
              <text x="310" y="200" fill="#FFF" fontSize="10" fontWeight="bold" textAnchor="middle" pointerEvents="none">Morada do Sol</text>
            </svg>

            {/* Hover Tooltip inside Map Container */}
            {hoveredRegion && (
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  background: 'rgba(7, 31, 19, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  pointerEvents: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}
              >
                <strong style={{ fontSize: '0.8rem', display: 'block', textTransform: 'capitalize' }}>
                  {REGIONS.find(r => r.id === hoveredRegion)?.name}
                </strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-gray)' }}>
                  População: {Number(REGIONS.find(r => r.id === hoveredRegion)?.population ?? 0).toLocaleString('pt-BR')}
                </span>
              </div>
            )}
          </div>

          {/* Quick Map Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', fontSize: '0.75rem', marginTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(0, 168, 89, 0.45)' }}></div>
              <span>Zona Forte (Dominante)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(0, 168, 89, 0.2)' }}></div>
              <span>Zona Média (Equilibrada)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(37, 99, 235, 0.35)' }}></div>
              <span>Zona Crítica (Oposição)</span>
            </div>
          </div>
        </div>

        {/* Right Widget: Vote Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Performance Overview in Active Filter */}
          <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-title)', fontWeight: 700 }}>
              Desempenho dos Candidatos
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '0.5rem' }}>
              {currentVotes.map((c) => {
                const pct = totalVotesCount > 0 ? ((c.votes / totalVotesCount) * 100).toFixed(2) : c.percentage;
                
                return (
                  <div 
                    key={c.candidateId}
                    style={{
                      padding: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: c.isTarget ? '1px solid var(--accent-green-bright)' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 'var(--radius-sm)',
                      boxShadow: c.isTarget ? '0 0 12px var(--accent-green-glow)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.2rem' }}>{c.avatar}</span>
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: '#FFFFFF' }}>{c.name}</strong>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-gray)', display: 'block' }}>{c.party}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '0.9rem', color: c.isTarget ? 'var(--accent-green-bright)' : '#FFFFFF' }}>
                          {Number(c.votes ?? 0).toLocaleString('pt-BR')}
                        </strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-gray)', display: 'block' }}>{pct}%</span>
                      </div>
                    </div>

                    {/* Progress Bar inside Card */}
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${pct}%`, 
                          height: '100%', 
                          background: c.color || 'var(--accent-green)',
                          borderRadius: '100px',
                          transition: 'width 0.8s ease'
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Granular Section List Drill-Down */}
          <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} style={{ color: 'var(--accent-blue-bright)' }} />
                <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-title)', fontWeight: 700 }}>
                  Seções e Locais
                </h3>
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-gray)', fontWeight: 600, textTransform: 'uppercase' }}>
                {selectedZone === 'all' ? 'Geral' : ZONES.find(z => z.id === selectedZone)?.name.split(' ')[1]}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
              {sections.map((sec, idx) => {
                const percentageInSec = ((sec.candidateVotes / sec.votes) * 100).toFixed(1);
                
                return (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: '4px',
                    }}
                  >
                    <div style={{ maxWidth: '70%' }}>
                      <strong style={{ fontSize: '0.75rem', color: '#FFFFFF', display: 'block' }}>{sec.section}</strong>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-gray)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {sec.location}
                      </span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '0.75rem', color: 'var(--accent-green-bright)', display: 'block' }}>
                        {sec.candidateVotes} / {sec.votes}
                      </strong>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-gray)', fontWeight: 600 }}>
                        {percentageInSec}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
