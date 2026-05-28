import React, { useState } from 'react';
import { 
  FileText, 
  Printer, 
  CheckSquare, 
  Sparkles, 
  MapPin, 
  TrendingUp,
  ShieldAlert
} from 'lucide-react';
import { CANDIDATES } from '../data/electoralMockData';
import { CAMPAIGN_METRICS } from '../data/crmMockData';

export default function Reports({ activeCandidate }) {
  const [includeAnalytics, setIncludeAnalytics] = useState(true);
  const [includeCRM, setIncludeCRM] = useState(true);
  const [includeAI, setIncludeAI] = useState(true);
  const [includeSWOT, setIncludeSWOT] = useState(true);

  const candidate = CANDIDATES.find(c => c.id === activeCandidate) || CANDIDATES[0];

  const campaignParams = typeof window !== 'undefined' ? (() => { try { return JSON.parse(localStorage.getItem('campaignParams')); } catch { return null; } })() : null;
  const cityName = campaignParams?.city || 'sua cidade';
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="grid-1-340"
      style={{ 
        minHeight: 'calc(100vh - var(--header-height) - 4rem)' 
      }}
    >
      
      {/* Left Widget: Report Configurator Sidebar Panel */}
      <div className="glass no-print" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={20} style={{ color: 'var(--accent-green-bright)' }} />
          <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-title)', fontWeight: 700 }}>
            Configurar Relatório
          </h3>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-gray)' }}>
          Marque quais seções analíticas devem ser consolidadas na folha de impressão final:
        </p>

        {/* Section Checkboxes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '0.5rem 0' }}>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={includeAnalytics} 
              onChange={() => setIncludeAnalytics(!includeAnalytics)} 
            />
            <div>
              <strong style={{ display: 'block', color: '#FFFFFF' }}>Desempenho Eleitoral (TSE)</strong>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-gray)' }}>Gráfico de votação geral por ano</span>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={includeCRM} 
              onChange={() => setIncludeCRM(!includeCRM)} 
            />
            <div>
              <strong style={{ display: 'block', color: '#FFFFFF' }}>Distribuição de Base (CRM)</strong>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-gray)' }}>Status geográfico e cobertura</span>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={includeAI} 
              onChange={() => setIncludeAI(!includeAI)} 
            />
            <div>
              <strong style={{ display: 'block', color: '#FFFFFF' }}>Diagnóstico da E-Poliana (IA)</strong>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-gray)' }}>Plano tático detalhado de comícios</span>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={includeSWOT} 
              onChange={() => setIncludeSWOT(!includeSWOT)} 
            />
            <div>
              <strong style={{ display: 'block', color: '#FFFFFF' }}>Análise SWOT Geral</strong>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-gray)' }}>Tabela comparativa competitiva</span>
            </div>
          </label>

        </div>

        {/* Print Button action trigger */}
        <button
          onClick={handlePrint}
          style={{
            background: 'linear-gradient(135deg, var(--accent-green) 0%, var(--accent-green-bright) 100%)',
            color: '#FFFFFF',
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(0, 168, 89, 0.35)',
            marginTop: '0.5rem'
          }}
        >
          <Printer size={18} />
          Imprimir Relatório (PDF)
        </button>
      </div>

      {/* Right Widget: Live Document A4 Preview Panel */}
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem',
          width: '100%',
          overflow: 'hidden'
        }}
      >
        <span style={{ fontSize: '0.75rem', color: 'var(--text-gray)', fontWeight: 600 }} className="no-print">
          Visualização Prévia do Relatório (A4):
        </span>

        {/* The Printable A4 preview container */}
        <div 
          className="glass"
          style={{
            background: '#FFFFFF',
            color: '#071F13', // Deep forest/dark print color
            padding: '3rem',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            width: '100%',
            maxWidth: '800px',
            alignSelf: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
            border: '1px solid rgba(0,0,0,0.1)',
            fontFamily: 'var(--font-sans)',
            boxSizing: 'border-box'
          }}
          id="print-sheet"
        >
          {/* Document Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #00A859', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: '1.5rem', color: '#00A859' }}>
                e-politica.ia
              </span>
              <span style={{ fontSize: '0.65rem', color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
                Relatório Geral Analítico de Campanha
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.7rem', color: '#666', display: 'block' }}>Data de Emissão: {new Date().toLocaleDateString('pt-BR')}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#333' }}>TSE: Conexão Oficial</span>
            </div>
          </div>

          {/* Candidate Profile Summary */}
          <div style={{ background: '#F4FAF6', border: '1px solid #D2EBDD', padding: '1.25rem', borderRadius: '8px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '2.5rem' }}>{candidate?.avatar || '👤'}</span>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#071F13' }}>
                Diagnóstico de Mandato: {candidate.name}
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#555' }}>
                Candidatura ao cargo de <strong>{candidate.role}</strong> pelo partido <strong>{candidate.party}</strong> em {cityName}.
              </span>
            </div>
          </div>

          {/* SECTION 1: Performance Eleitoral (TSE) */}
          {includeAnalytics && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h3 style={{ fontSize: '1.05rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', color: '#00A859' }}>
                <TrendingUp size={16} /> 1. Histórico de Desempenho Eleitoral Geral
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#444', lineHeight: 1.4 }}>
                Análise consolidada das duas últimas campanhas oficiais com dados de votação e prestação de contas do TSE para o candidato <strong>{candidate.name}</strong>.
              </p>
              
              {/* Simulated mini chart representing election metrics */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                <div style={{ flexGrow: 1, padding: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: '#666', display: 'block' }}>Pleito 2022 (Deputado Estadual)</span>
                  <strong style={{ fontSize: '0.9rem', color: '#333' }}>15.100 votos totais</strong>
                  <span style={{ fontSize: '0.65rem', color: '#888', display: 'block' }}>12.450 votos em Porto Velho</span>
                </div>
                <div style={{ flexGrow: 1, padding: '10px', background: '#F8FAFC', border: '1px solid #D2EBDD', borderRadius: '4px', textAlign: 'center', borderLeft: '3px solid #00A859' }}>
                  <span style={{ fontSize: '0.7rem', color: '#00A859', display: 'block', fontWeight: 600 }}>Pleito 2024 (Vereador - ELEITO)</span>
                  <strong style={{ fontSize: '0.9rem', color: '#00A859' }}>4.850 votos (Porto Velho)</strong>
                  <span style={{ fontSize: '0.65rem', color: '#00A859', display: 'block', fontWeight: 500 }}>Votação consagrada e eleito</span>
                </div>
              </div>

              {/* Prestação de Contas & Custo por Voto Analysis */}
              <div style={{ marginTop: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px', borderRadius: '6px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#071F13', marginBottom: '8px' }}>💰 Análise de Prestação de Contas (Custo Eleitoral)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.75rem', color: '#444' }}>
                  <div style={{ borderRight: '1px solid #E2E8F0', paddingRight: '8px' }}>
                    <strong style={{ color: '#071F13', display: 'block', marginBottom: '4px' }}>Campanha 2022 (Deputado Estadual)</strong>
                    <span>Despesa Total: <strong>R$ 195.000,00</strong></span><br />
                    <span>Custo por Voto: <strong style={{ color: 'var(--accent-yellow-dark)' }}>R$ 12,91 / voto</strong></span>
                  </div>
                  <div>
                    <strong style={{ color: '#00A859', display: 'block', marginBottom: '4px' }}>Campanha 2024 (Vereador)</strong>
                    <span>Despesa Total: <strong>R$ 85.000,00</strong></span><br />
                    <span>Custo por Voto: <strong style={{ color: '#00A859' }}>R$ 17,52 / voto</strong></span>
                  </div>
                </div>
              </div>

              {/* Votação por Cidade em 2022 */}
              <div style={{ marginTop: '8px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#071F13', marginBottom: '6px' }}>📍 Votação em Cidades (Deputado Estadual 2022)</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', background: '#E2E8F0', padding: '4px 8px', borderRadius: '4px', color: '#333' }}><strong>Porto Velho:</strong> 12.450 votos (82.5%)</span>
                  <span style={{ fontSize: '0.72rem', background: '#E2E8F0', padding: '4px 8px', borderRadius: '4px', color: '#333' }}><strong>Candeias do Jamari:</strong> 1.230 votos (8.1%)</span>
                  <span style={{ fontSize: '0.72rem', background: '#E2E8F0', padding: '4px 8px', borderRadius: '4px', color: '#333' }}><strong>Itapuã do Oeste:</strong> 480 votos (3.2%)</span>
                  <span style={{ fontSize: '0.72rem', background: '#E2E8F0', padding: '4px 8px', borderRadius: '4px', color: '#333' }}><strong>Nova Mamoré:</strong> 340 votos (2.3%)</span>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: Distribuição de Base (CRM) */}
          {includeCRM && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h3 style={{ fontSize: '1.05rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', color: '#00A859' }}>
                <MapPin size={16} /> 2. Mapeamento de Base e Lideranças Comunitárias
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#444', lineHeight: 1.4 }}>
                Resumo da capilaridade territorial no município. O CRM de campanha registra cobertura completa em <strong>{CAMPAIGN_METRICS.regionsCovered} bairros</strong> municipais fundamentais para a mobilização de votos.
              </p>

              {/* CRM Key data list */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '4px' }}>
                <div style={{ padding: '8px', borderLeft: '3px solid #2563EB', background: '#F3F4F6' }}>
                  <span style={{ fontSize: '0.65rem', color: '#666', display: 'block', fontWeight: 600 }}>BASE MAPEADA NO CRM</span>
                  <strong style={{ fontSize: '1rem', color: '#111' }}>{candidate.baseCount.toLocaleString()} apoiadores</strong>
                </div>
                <div style={{ padding: '8px', borderLeft: '3px solid #FFCC00', background: '#F3F4F6' }}>
                  <span style={{ fontSize: '0.65rem', color: '#666', display: 'block', fontWeight: 600 }}>LIDERANÇAS E VOLUNTÁRIOS ATIVOS</span>
                  <strong style={{ fontSize: '1rem', color: '#111' }}>{CAMPAIGN_METRICS.leadersCount} coordenadores</strong>
                </div>
              </div>

              {/* Porto Velho Zones & União Bandeirantes */}
              {cityName.toUpperCase().includes('PORTO VELHO') && (
                <div style={{ marginTop: '12px' }}>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#071F13', marginBottom: '6px' }}>🏫 Locais de Votação e Zonas Eleitorais Reais (Porto Velho 2024)</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem', border: '1px solid #E2E8F0' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                        <th style={{ padding: '6px', fontWeight: 700 }}>Zona Eleitoral</th>
                        <th style={{ padding: '6px', fontWeight: 700 }}>Bairro / Distrito</th>
                        <th style={{ padding: '6px', fontWeight: 700 }}>Local de Votação Principal</th>
                        <th style={{ padding: '6px', fontWeight: 700, textAlign: 'right' }}>Votação Estimada</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '6px' }}><strong>Zona 02</strong></td>
                        <td style={{ padding: '6px' }}>Centro / Sede</td>
                        <td style={{ padding: '6px' }}>Colégio Tiradentes da PM-RO</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>1.150 votos</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '6px' }}><strong>Zona 20</strong></td>
                        <td style={{ padding: '6px' }}>Zona Leste</td>
                        <td style={{ padding: '6px' }}>Escola Estadual Major Guapindaia</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>1.450 votos</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '6px' }}><strong>Zona 21</strong></td>
                        <td style={{ padding: '6px' }}>Zona Sul</td>
                        <td style={{ padding: '6px' }}>Escola Estadual Marechal Rondon</td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>1.130 votos</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px', color: '#00A859' }}><strong>Zona 22</strong></td>
                        <td style={{ padding: '6px', color: '#00A859', fontWeight: 700 }}>União Bandeirantes</td>
                        <td style={{ padding: '6px', color: '#00A859' }}>Escola Claudio Manoel da Costa</td>
                        <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700, color: '#00A859' }}>1.120 votos</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: Diagnóstico da E-Poliana (IA) */}
          {includeAI && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h3 style={{ fontSize: '1.05rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', color: '#00A859' }}>
                <Sparkles size={16} style={{ color: '#FFCC00' }} /> 3. Diagnóstico Estratégico da E-Poliana AI
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#444', lineHeight: 1.4 }}>
                Plano de ação estratégico autogerado a partir das oscilações de votos:
              </p>
              
              <ul style={{ paddingLeft: '1.5rem', fontSize: '0.76rem', color: '#333', lineHeight: 1.5 }}>
                <li><strong>Consolidação em Vila Nova:</strong> Bairro residencial popular com <strong>47.5%</strong> de preferência. Ação imediata: mobilizar caminhada de zeladoria urbana liderada por Liderança de referência.</li>
                <li><strong>Contenção nos Jardins:</strong> Bairro de alta renda com forte liderança adversária (65%). Ação: focar discurso técnico em *Segurança Integrada* e desburocratização de alvarás de comércio.</li>
                <li><strong>Crescimento no Distrito Industrial:</strong> Direcionar propostas de *Cursos Técnicos* profissionalizantes para reter votos indecisos.</li>
              </ul>
            </div>
          )}

          {/* SECTION 4: Análise SWOT */}
          {includeSWOT && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h3 style={{ fontSize: '1.05rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', color: '#00A859' }}>
                <ShieldAlert size={16} /> 4. Matriz SWOT e Competidores
              </h3>
              
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', border: '1px solid #E2E8F0', marginTop: '6px' }}>
                <thead>
                  <tr style={{ background: '#F4FAF6', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px', fontWeight: 700 }}>Pilar</th>
                    <th style={{ padding: '6px 8px', fontWeight: 700 }}>{CANDIDATES[0]?.name || 'Candidato'}</th>
                    <th style={{ padding: '6px 8px', fontWeight: 700 }}>{CANDIDATES[1]?.name || 'Oponente 1'} ({CANDIDATES[1]?.party || ''})</th>
                    <th style={{ padding: '6px 8px', fontWeight: 700 }}>{CANDIDATES[2]?.name || 'Oponente 2'} ({CANDIDATES[2]?.party || ''})</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 700 }}>Força (S)</td>
                    <td style={{ padding: '6px 8px' }}>Saúde geral, base popular ampla</td>
                    <td style={{ padding: '6px 8px' }}>Elite econômica, grande verba</td>
                    <td style={{ padding: '6px 8px' }}>Militância periférica sólida</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 8px', fontWeight: 700 }}>Ameaça (T)</td>
                    <td style={{ padding: '6px 8px' }}>Ataques digitais de oposição</td>
                    <td style={{ padding: '6px 8px' }}>Perda de eleitorado moderado</td>
                    <td style={{ padding: '6px 8px' }}>Migração de voto útil</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Document Footer (Print layout signature) */}
          <div style={{ marginTop: 'auto', borderTop: '1px solid #DDD', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#777' }}>
            <span>e-politica.ia inteligência eleitoral privada</span>
            <div style={{ textAlign: 'right' }}>
              <span>Assinatura do Coordenador de Campanha:</span>
              <div style={{ width: '220px', borderBottom: '1px dashed #666', marginTop: '1.5rem' }}></div>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        /* Embed layout adjustment for print sheets */
        @media print {
          #print-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
