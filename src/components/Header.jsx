import { Menu, Bell, ShieldCheck, ChevronDown } from 'lucide-react';
import { CANDIDATES } from '../data/electoralMockData';

export default function Header({
  activePage,
  activeCandidate,
  setActiveCandidate,
  toggleMobileSidebar,
  sidebarCollapsed,
  activeUser,
  candidates
}) {

  const getPageTitle = () => {
    switch (activePage) {
      case 'dashboard': return 'Painel Geral';
      case 'apuracao-tse': return 'Apuração TSE';
      case 'consultoria': return 'Consultoria IA';
      case 'assistant': return 'Mestre AI';
      case 'crm': return 'Gestão de Base (CRM)';
      case 'reports': return 'Relatórios';
      default: return 'e-politica.ia';
    }
  };

  const candidateList = candidates && candidates.length > 0 ? candidates : CANDIDATES;
  const currentCandidateObj = candidateList.find(c => c.id === activeCandidate) || candidateList[0];

  return (
    <header
      className="app-header"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        left: sidebarCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        height: 'var(--header-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        zIndex: 99,
        background: 'var(--header-bg)',
        borderBottom: '1px solid var(--border-color)',
        boxShadow: '0 2px 12px rgba(20,30,60,0.04)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Left: mobile toggle + page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={toggleMobileSidebar}
          style={{
            background: 'var(--row-alt)',
            border: '1px solid var(--border-color)',
            padding: '8px',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-white)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          className="no-print mobile-only"
        >
          <Menu size={20} />
        </button>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-title)', color: 'var(--text-white)' }}>
          {getPageTitle()}
        </h2>
      </div>

      {/* Right: TSE badge, candidate selector, bell, profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }} className="no-print">

        {/* TSE Connection Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.72rem',
            background: 'rgba(22,163,99,0.10)',
            border: '1px solid rgba(22,163,99,0.22)',
            padding: '5px 11px',
            borderRadius: '100px',
            color: 'var(--accent-green)',
            fontWeight: 700
          }}
        >
          <ShieldCheck size={14} />
          <span className="desktop-only" style={{ display: 'inline-block' }}>TSE CONECTADO</span>
        </div>

        {/* Candidate Switcher */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--row-alt)',
              border: '1px solid var(--border-color)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>{currentCandidateObj.avatar}</span>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: '100px' }} className="desktop-only">
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
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', padding: 0 }}
            >
              {candidateList.map(c => (
                <option key={c.id} value={c.id} style={{ background: '#fff', color: 'var(--text-white)' }}>
                  {c.name} ({c.party})
                </option>
              ))}
            </select>
            <ChevronDown size={14} style={{ color: 'var(--text-gray)' }} />
          </div>
        </div>

        {/* Notifications */}
        <button
          style={{
            position: 'relative',
            background: 'var(--row-alt)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-gray)',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-blue-bright)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-gray)')}
          aria-label="Notificações"
        >
          <Bell size={18} />
          <span style={{ position: 'absolute', top: '7px', right: '8px', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--danger)', border: '2px solid var(--bg-dark-sidebar)' }} />
        </button>

        {/* User Profile */}
        {activeUser && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingLeft: '12px',
              borderLeft: '1px solid var(--border-color)',
              height: '36px'
            }}
          >
            <span
              style={{
                fontSize: '1.3rem',
                background: 'var(--row-alt)',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-color)'
              }}
              title={`${activeUser.name} (${activeUser.email})`}
            >
              {activeUser.avatar || '👤'}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', maxWidth: '180px' }} className="desktop-only">
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-white)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeUser.name}
              </span>
              <span style={{ fontSize: '0.6rem', color: 'var(--accent-blue-bright)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeUser.title ? activeUser.title.toUpperCase() : 'ASSINANTE'}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
