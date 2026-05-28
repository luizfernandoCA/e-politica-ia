import React from 'react';
import { Menu, Bell, ShieldCheck, ChevronDown } from 'lucide-react';
import { CANDIDATES } from '../data/electoralMockData';

export default function Header({ 
  activePage, 
  activeCandidate, 
  setActiveCandidate, 
  sidebarCollapsed, 
  setSidebarCollapsed,
  toggleMobileSidebar,
  activeUser,
  candidates
}) {
  
  const getPageTitle = () => {
    switch (activePage) {
      case 'dashboard': return 'Painel Geral';
      case 'analytics': return 'Análise Eleitoral';
      case 'assistant': return 'E-Poliana AI';
      case 'comparison': return 'Comparativo de Candidatos';
      case 'crm': return 'Gestão de Base (CRM)';
      case 'reports': return 'Relatórios de Planejamento';
      default: return 'e-politica.ia';
    }
  };

  const candidateList = candidates && candidates.length > 0 ? candidates : CANDIDATES;
  const currentCandidateObj = candidateList.find(c => c.id === activeCandidate) || candidateList[0];

  return (
    <header
      className="glass"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        left: 0,
        height: 'var(--header-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        zIndex: 99,
        borderWidth: '0 0 1px 0',
        borderRadius: 0,
        background: 'rgba(7, 31, 19, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Left side: Toggle button (mobile/collapsed desktop) and Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={toggleMobileSidebar}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '8px',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-white)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          className="no-print"
        >
          <Menu size={20} />
        </button>
        
        <h2 
          style={{ 
            fontSize: '1.25rem', 
            fontWeight: 700,
            fontFamily: 'var(--font-title)',
            color: 'var(--text-white)'
          }}
        >
          {getPageTitle()}
        </h2>
      </div>

      {/* Right side: Database connectivity, Active Candidate Selector & Profile info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }} className="no-print">
        
        {/* TSE Connection Badge */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            fontSize: '0.75rem',
            background: 'rgba(0, 168, 89, 0.1)',
            border: '1px solid rgba(0, 168, 89, 0.2)',
            padding: '4px 10px',
            borderRadius: '100px',
            color: 'var(--accent-green-bright)',
            fontWeight: 600
          }}
          className="pulse-glow-green"
        >
          <ShieldCheck size={14} />
          <span style={{ display: 'inline-block' }}>TSE CONECTADO</span>
        </div>

        {/* Dynamic Candidate Switcher */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>{currentCandidateObj.avatar}</span>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: '100px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-white)', lineHeight: 1.2 }}>
                {currentCandidateObj.name}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-gray)', fontWeight: 500 }}>
                {currentCandidateObj.party}
              </span>
            </div>
            
            <select
              value={activeCandidate}
              onChange={(e) => setActiveCandidate(e.target.value)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
              }}
            >
              {candidateList.map(c => (
                <option key={c.id} value={c.id} style={{ background: 'var(--bg-dark)', color: 'var(--text-white)' }}>
                  {c.name} ({c.party})
                </option>
              ))}
            </select>
            <ChevronDown size={14} style={{ color: 'var(--text-gray)' }} />
          </div>
        </div>

        {/* Notifications Icon */}
        <button
          style={{
            background: 'transparent',
            color: 'var(--text-gray)',
            padding: '4px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-gray)'}
        >
          <Bell size={20} />
        </button>

        {/* Google User Profile */}
        {activeUser && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              paddingLeft: '12px',
              borderLeft: '1px solid var(--border-color)',
              height: '32px'
            }}
          >
            <span 
              style={{ 
                fontSize: '1.4rem', 
                background: 'rgba(255,255,255,0.05)', 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
              title={`${activeUser.name} (${activeUser.email})`}
            >
              {activeUser.avatar || '👤'}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', maxWidth: '180px' }} className="desktop-only">
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-white)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeUser.name}
              </span>
              <span style={{ fontSize: '0.6rem', color: 'var(--accent-green-bright)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeUser.title ? activeUser.title.toUpperCase() : 'ASSINANTE'}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
