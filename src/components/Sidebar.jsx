import {
  LayoutDashboard,
  Brain,
  Target,
  FileText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sliders,
  Vote,
  Sparkles,
  Crosshair,
} from 'lucide-react';
import Logo from './Logo';

export default function Sidebar({
  activePage,
  setActivePage,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  onLogout,
  onReconfigure
}) {

  const menuItems = [
    { id: 'dashboard', name: 'Painel Geral', icon: LayoutDashboard },
    { id: 'apuracao-tse', name: 'Apuração TSE', icon: Vote },
    { id: 'consultoria', name: 'Consultoria IA', icon: Sparkles },
    { id: 'plano-tatico', name: 'Plano Tático', icon: Crosshair, badge: 'NOVO' },
    { id: 'assistant', name: 'Mestre AI', icon: Brain },
    { id: 'crm', name: 'Gestão de Base', icon: Target },
    { id: 'reports', name: 'Relatórios', icon: FileText }
  ];

  const handleNavClick = (pageId) => {
    setActivePage(pageId);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20,30,60,0.35)',
            backdropFilter: 'blur(2px)',
            zIndex: 998,
          }}
          className="no-print"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`no-print app-sidebar${mobileOpen ? ' is-open' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
          background: 'var(--bg-dark-sidebar)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 999,
          transition: 'width var(--transition-normal), transform var(--transition-normal)',
        }}
      >
        {/* Header/Logo section */}
        <div
          style={{
            height: 'var(--header-height)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            overflow: 'hidden'
          }}
        >
          <Logo size={32} showText={!collapsed} />
        </div>

        {/* Navigation Items */}
        <nav style={{ flexGrow: 1, padding: '1.25rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                title={collapsed ? item.name : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: collapsed ? '0' : '12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: '12px 14px',
                  width: '100%',
                  borderRadius: 'var(--radius-sm)',
                  background: isActive ? 'var(--accent-blue)' : 'transparent',
                  border: '1px solid transparent',
                  color: isActive ? '#FFFFFF' : 'var(--text-gray)',
                  boxShadow: isActive ? '0 8px 18px rgba(72,128,255,0.30)' : 'none',
                  transition: 'all var(--transition-fast)',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--text-white)';
                    e.currentTarget.style.background = 'var(--row-alt)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--text-gray)';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <Icon
                  size={20}
                  style={{
                    color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                    transition: 'color var(--transition-fast)',
                    flexShrink: 0
                  }}
                />
                {!collapsed && (
                  <span style={{ fontSize: '0.9rem', fontWeight: isActive ? 600 : 500 }}>
                    {item.name}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Reconfigure Campaign Button */}
        {onReconfigure && (
          <div style={{ padding: '0.25rem 0.75rem', marginBottom: '0.25rem' }}>
            <button
              onClick={onReconfigure}
              title={collapsed ? 'Ajustar Campanha' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? '0' : '12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: '12px 14px',
                width: '100%',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--row-alt)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-gray)',
                transition: 'all var(--transition-fast)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-blue)';
                e.currentTarget.style.color = 'var(--accent-blue-bright)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.color = 'var(--text-gray)';
              }}
            >
              <Sliders size={20} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
              {!collapsed && (
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Ajustar Campanha</span>
              )}
            </button>
          </div>
        )}

        {/* Legal links (LGPD) */}
        {!collapsed && (
          <div
            style={{
              padding: '0.5rem 1rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}
          >
            <a href="#/privacidade" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
              Privacidade
            </a>
            <a href="#/termos" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
              Termos
            </a>
          </div>
        )}

        {/* Logout Button */}
        <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={() => { if (onLogout) onLogout(); }}
            title={collapsed ? 'Sair' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? '0' : '12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: '12px 14px',
              width: '100%',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              border: '1px solid transparent',
              color: 'var(--danger)',
              transition: 'all var(--transition-fast)',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <LogOut size={20} style={{ flexShrink: 0 }} />
            {!collapsed && <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Sair</span>}
          </button>
        </div>

        {/* Collapse Toggle (Desktop only) */}
        <div
          style={{
            padding: '1rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'center',
          }}
          className="desktop-only"
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'var(--row-alt)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-gray)',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-blue-bright)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-gray)')}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>

      <style>{`
        @media (min-width: 769px) {
          .app-sidebar { transform: none !important; }
        }
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .app-sidebar { transform: translateX(-100%); width: var(--sidebar-width) !important; }
          .app-sidebar.is-open { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
