import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Import Public Onboarding Pages
import LandingPage from './pages/LandingPage';
import Checkout from './pages/Checkout';
import CampaignSetup from './pages/CampaignSetup';

// Import Dashboard Tool Pages
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Assistant from './pages/Assistant';
import Comparison from './pages/Comparison';
import CRM from './pages/CRM';
import Reports from './pages/Reports';

// Import Mock Data
import { CANDIDATES as initialCandidates } from './data/electoralMockData';
import { CRM_CONTACTS as initialContacts, CAMPAIGN_CHECKLIST as initialTasks } from './data/crmMockData';

export default function App() {
  // Authentication & Onboarding States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [activeUser, setActiveUser] = useState(null); // Google Profile details
  const [isCampaignConfigured, setIsCampaignConfigured] = useState(() => {
    return typeof window !== 'undefined' ? !!localStorage.getItem('campaignParams') : false;
  });
  const [campaignParams, setCampaignParams] = useState(() => {
    return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('campaignParams')) : null;
  });

  // Navigation & UI States
  const [activePage, setActivePage] = useState('dashboard');
  const [activeCandidate, setActiveCandidate] = useState('dr-marcos-silva');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Shared Global React States (allows interactive cross-page synchronization)
  const [candidates, setCandidates] = useState(initialCandidates);
  const [contacts, setContacts] = useState(() => {
    const isConfigured = typeof window !== 'undefined' ? !!localStorage.getItem('campaignParams') : false;
    if (isConfigured) {
      const savedContacts = typeof window !== 'undefined' ? localStorage.getItem('crmContacts') : null;
      return savedContacts ? JSON.parse(savedContacts) : [];
    }
    return initialContacts;
  });
  const [tasks, setTasks] = useState(() => {
    const isConfigured = typeof window !== 'undefined' ? !!localStorage.getItem('campaignParams') : false;
    if (isConfigured) {
      const savedTasks = typeof window !== 'undefined' ? localStorage.getItem('campaignTasks') : null;
      if (savedTasks) return JSON.parse(savedTasks);
      
      const params = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('campaignParams')) : null;
      return [
        { id: 1, text: `Registrar comitê central em ${params?.city || 'sua cidade'}`, done: false, category: 'Administrativo' },
        { id: 2, text: `Cadastrar as primeiras 50 lideranças no CRM`, done: false, category: 'Lideranças' },
        { id: 3, text: `Gerar SWOT tático com a E-Poliana AI`, done: false, category: 'Estratégia' },
        { id: 4, text: `Cruzar seções eleitorais de ${params?.city || 'sua cidade'} do TRE-RO`, done: false, category: 'Análise' }
      ];
    }
    return initialTasks;
  });

  // Persist contacts and tasks to localStorage if campaign is configured
  useEffect(() => {
    if (isCampaignConfigured && typeof window !== 'undefined') {
      localStorage.setItem('crmContacts', JSON.stringify(contacts));
    }
  }, [contacts, isCampaignConfigured]);

  useEffect(() => {
    if (isCampaignConfigured && typeof window !== 'undefined') {
      localStorage.setItem('campaignTasks', JSON.stringify(tasks));
    }
  }, [tasks, isCampaignConfigured]);

  // Helper to toggle mobile sidebar
  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  // Handle successful subscription payment
  const handlePaymentSuccess = (userObj) => {
    setActiveUser(userObj);
    setIsAuthenticated(true);
  };

  // Handle campaign setup wizard completion
  const handleSetupComplete = (params) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('campaignParams', JSON.stringify(params));
    }
    setCampaignParams(params);

    const userCandidateId = 'dr-marcos-silva'; // Preserve key internally
    const customCandidates = [
      {
        id: userCandidateId,
        name: params.candidateName,
        party: `${params.party} (15)`,
        role: params.role,
        avatar: params.role === 'Prefeito' ? '👨‍⚖️' : '👨‍💼',
        color: 'var(--accent-green)',
        status: 'Candidato Principal',
        baseCount: 0, // CLEAN empty CRM start!
        targetGoal: 10000
      },
      {
        id: 'ana-souza',
        name: 'Oponente PL',
        party: 'PL (22)',
        role: params.role,
        avatar: '👩‍💼',
        color: 'var(--accent-blue)',
        status: 'Concorrente 1',
        baseCount: 0,
        targetGoal: 9500
      },
      {
        id: 'roberto-lima',
        name: 'Oponente PT',
        party: 'PT (13)',
        role: params.role,
        avatar: '👨‍💼',
        color: 'var(--accent-yellow)',
        status: 'Concorrente 2',
        baseCount: 0,
        targetGoal: 8000
      }
    ];

    setCandidates(customCandidates);
    setActiveCandidate(userCandidateId);
    setContacts([]); // Starts with absolutely 0 pre-registered contacts!

    setTasks([
      { id: 1, text: `Registrar comitê central em ${params.city}`, done: false, category: 'Administrativo' },
      { id: 2, text: `Cadastrar as primeiras 50 lideranças no CRM`, done: false, category: 'Lideranças' },
      { id: 3, text: `Gerar SWOT tático com a E-Poliana AI`, done: false, category: 'Estratégia' },
      { id: 4, text: `Cruzar seções eleitorais de ${params.city} do TRE-RO`, done: false, category: 'Análise' }
    ]);

    setIsCampaignConfigured(true);
    setActivePage('dashboard');

    // Confetti!
    import('canvas-confetti').then((confetti) => {
      confetti.default({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#00A859', '#FFCC00', '#2563EB', '#FFFFFF']
      });
    }).catch(() => {});
  };

  // Handle logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    setShowCheckout(false);
    setActiveUser(null);
    setIsCampaignConfigured(false);
    setCampaignParams(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('campaignParams');
    }
    window.location.reload(); // Force reload to reinitialize mock databases cleanly!
  };

  // Render active dashboard tool view
  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <Dashboard 
            activeCandidate={activeCandidate} 
            tasks={tasks} 
            setTasks={setTasks}
            setActivePage={setActivePage}
          />
        );
      case 'analytics':
        return (
          <Analytics 
            activeCandidate={activeCandidate} 
          />
        );
      case 'assistant':
        return (
          <Assistant 
            activeCandidate={activeCandidate} 
          />
        );
      case 'comparison':
        return (
          <Comparison />
        );
      case 'crm':
        return (
          <CRM 
            contacts={contacts} 
            setContacts={setContacts} 
            candidates={candidates}
            setCandidates={setCandidates}
            activeCandidate={activeCandidate} 
          />
        );
      case 'reports':
        return (
          <Reports 
            activeCandidate={activeCandidate} 
          />
        );
      default:
        return (
          <Dashboard 
            activeCandidate={activeCandidate} 
            tasks={tasks} 
            setTasks={setTasks}
            setActivePage={setActivePage}
          />
        );
    }
  };

  // =========================================================================
  // Unauthenticated Public Funnel Views
  // =========================================================================
  if (!isAuthenticated) {
    if (showCheckout) {
      return (
        <Checkout 
          onPaymentSuccess={handlePaymentSuccess} 
          onBackToLanding={() => setShowCheckout(false)} 
        />
      );
    }
    return (
      <LandingPage 
        onStartCheckout={() => setShowCheckout(true)} 
      />
    );
  }

  // =========================================================================
  // Authenticated Campaign Setup Wizard (Clean empty start)
  // =========================================================================
  if (!isCampaignConfigured) {
    return (
      <CampaignSetup 
        onSetupComplete={handleSetupComplete} 
      />
    );
  }

  // =========================================================================
  // Authenticated Dashboard Shell Layout
  // =========================================================================
  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Top Header */}
        <Header 
          activePage={activePage}
          activeCandidate={activeCandidate}
          setActiveCandidate={setActiveCandidate}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          toggleMobileSidebar={toggleMobileSidebar}
          activeUser={activeUser}
        />

        {/* Selected Page view */}
        <main style={{ width: '100%' }}>
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}
