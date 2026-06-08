import {
  LayoutDashboard,
  Brain,
  Target,
  FileText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sliders,
  Vote
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
    { id: 'dashboard', name: 'Painel Geral', icon: LayoutDashboard, color: 'var(--accent-green)' },
    { id: 'apuracao-tse', name: 'Apuração TSE', icon: Vote, color: 'var(--accent-green)' },
    { id: 'assistant', name: 'E-Poliana AI', icon: Brain, color: 'var(--accent-yellow)' },
    { id: 'crm', name: 'Gestão de Base', icon: Target, color: 'var(--accent-green)' },
    { id: 'reports', name: 'Relatórios', icon: FileText, color: 'var(--text-white)' }
  ];

  const handleNavClick = (pageId) => {
    setActivePage(pageId);
    setMobileOpen(false); // Close mobile drawer when clicking navigation
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
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 998,
          }}
          className="no-print"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className="no-print"
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
          transform: mobileOpen ? 'translateX(0)' : undefined,
        }}
        // Apply responsive mobile drawer classes
        ref={(el) => {
          if (el) {
            if (window.innerWidth <= 768) {
              el.style.transform = mobileOpen ? 'translateX(0)' : 'translateX(-100%)';
              el.style.width = 'var(--sidebar-width)';
            } else {
              el.style.transform = 'none';
            }
          }
        }}
      >
        {/* Header/Logo section */}
        <div
          style={{
            height: 'var(--header-height)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: collapsed ? '0' : '0 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            overflow: 'hidden'
          }}
        >
          <Logo size={32} showText={!collapsed} />
        </div>

        {/* Navigation Items */}
        <nav style={{ flexGrow: 1, padding: '1.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: collapsed ? '0' : '12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: '12px',
                  width: '100%',
                  borderRadius: 'var(--radius-sm)',
                  background: isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                  border: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
                  color: isActive ? '#FFFFFF' : 'var(--text-gray)',
                  transition: 'all var(--transition-fast)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#FFFFFF';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--text-gray)';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {/* Left Active highlight border bar */}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '20%',
                      bottom: '20%',
                      width: '4px',
                      background: 'linear-gradient(to bottom, var(--accent-green), var(--accent-yellow))',
                      borderRadius: '0 4px 4px 0',
                    }}
                  />
                )}

                <Icon 
                  size={20} 
                  style={{ 
                    color: isActive ? item.color : 'var(--text-gray)', 
                    transition: 'color var(--transition-fast)' 
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? '0' : '12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: '12px',
                width: '100%',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'var(--text-gray)',
                transition: 'all var(--transition-fast)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = 'var(--text-gray)';
              }}
            >
              <Sliders size={20} style={{ color: 'var(--accent-blue-bright)' }} />
              {!collapsed && (
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                  Ajustar Campanha
                </span>
              )}
            </button>
          </div>
        )}

        {/* Logout Button */}
        <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={() => {
              if (onLogout) onLogout();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? '0' : '12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: '12px',
              width: '100%',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              border: '1px solid transparent',
              color: '#EF4444',
              transition: 'all var(--transition-fast)',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
            }}
          >
            <LogOut size={20} />
            {!collapsed && (
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                Sair
              </span>
            )}
          </button>
        </div>

        {/* Collapsed Expand Toggle Footer (Desktop only) */}
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
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-gray)',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-gray)'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>

      {/* Modern styles to toggle mobile sidebar transitions & display */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-only {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
