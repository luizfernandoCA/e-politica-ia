import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Import Public Onboarding Pages
import LandingPage from './pages/LandingPage';
import Checkout from './pages/Checkout';
import CampaignSetup from './pages/CampaignSetup';

// Import Dashboard Tool Pages
import Dashboard from './pages/Dashboard';
import Assistant from './pages/Assistant';
import CRM from './pages/CRM';
import Reports from './pages/Reports';
import ApuracaoTSE from './pages/ApuracaoTSE';
import ErrorBoundary from './components/ErrorBoundary';
// Páginas legadas (Analytics/Comparison) foram absorvidas pela ApuracaoTSE
// (que usa dados reais do TSE em vez do mock). Arquivos permanecem no repo
// como referência histórica mas não são mais rotas ativas.

// Demo electoral dataset (analytics simulations) + empty CRM defaults
import { CANDIDATES as initialCandidates, reinitializeElectoralMockData } from './data/electoralMockData';
import { CRM_CONTACTS as initialContacts, CAMPAIGN_CHECKLIST as initialTasks } from './data/crmMockData';

// Real services (Supabase Auth + Postgres with RLS)
import { onAuthChange, getSession, mapUser, signOut, isVipEmail } from './services/authService';
import {
  saveCampaignParams,
  getCampaignParams,
  saveTasks,
  getTasks,
  saveContacts,
  getContacts,
  getPaymentStatus,
  savePaymentStatus
} from './services/dbService';

export default function App() {
  // Authentication & Onboarding States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [activeUser, setActiveUser] = useState(null);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [isCampaignConfigured, setIsCampaignConfigured] = useState(false);
  const [, setCampaignParams] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Navigation & UI States
  const [activePage, setActivePage] = useState('dashboard');
  const [activeCandidate, setActiveCandidate] = useState('dr-marcos-silva');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Shared Global React States (allows interactive cross-page synchronization)
  const [candidates, setCandidates] = useState(initialCandidates);
  const [contacts, setContacts] = useState([]);
  const [tasks, setTasks] = useState([]);

  // =========================================================================
  // 1. Supabase Authentication Session Listener
  // =========================================================================
  useEffect(() => {
    let unsubscribe = () => {};

    async function initAuth() {
      // Restore existing session first (page reload / OAuth redirect)
      try {
        const session = await getSession();
        if (session?.user) {
          setActiveUser(mapUser(session.user));
          setIsAuthenticated(true);
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Erro ao restaurar sessão Supabase:', err);
        setIsLoading(false);
      }

      // Listen for sign-in / sign-out events
      unsubscribe = onAuthChange((user) => {
        if (user) {
          setActiveUser(user);
          setIsAuthenticated(true);
        } else {
          setActiveUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      });
    }

    initAuth();
    return () => unsubscribe();
  }, []);

  // =========================================================================
  // 2. Fetch User Data (Supabase / cache fallback) once authenticated
  // =========================================================================
  useEffect(() => {
    async function loadUserData() {
      if (!activeUser) return;
      setIsLoading(true);
      const userId = activeUser.uid;

      try {
        // 0. Subscription status (VIPs always have access)
        if (isVipEmail(activeUser.email)) {
          setSubscriptionActive(true);
        } else {
          const payment = await getPaymentStatus(userId);
          setSubscriptionActive(payment?.status === 'active' || payment?.status === 'approved');
        }

        // 1. Load Campaign parameters
        const params = await getCampaignParams(userId);
        if (params) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('campaignParams', JSON.stringify(params));
          }
          reinitializeElectoralMockData();
          setCampaignParams(params);
          setIsCampaignConfigured(true);

          const userCandidateId = 'dr-marcos-silva';
          setCandidates([...initialCandidates]);
          setActiveCandidate(userCandidateId);
        } else {
          setIsCampaignConfigured(false);
          setCampaignParams(null);
          setCandidates(initialCandidates);
        }

        // 2. Load CRM Contacts
        const loadedContacts = await getContacts(userId);
        if (loadedContacts) {
          setContacts(loadedContacts);
        } else {
          setContacts(params ? [] : initialContacts);
        }

        // 3. Load Tasks
        const loadedTasks = await getTasks(userId);
        if (loadedTasks) {
          setTasks(loadedTasks);
        } else {
          if (params) {
            setTasks([
              { id: 1, text: `Registrar comitê central em ${params.city}`, done: false, category: 'Administrativo' },
              { id: 2, text: `Cadastrar as primeiras 50 lideranças no CRM`, done: false, category: 'Lideranças' },
              { id: 3, text: `Gerar SWOT tático com o Mestre AI`, done: false, category: 'Estratégia' },
              { id: 4, text: `Cruzar seções eleitorais de ${params.city} do TRE-RO`, done: false, category: 'Análise' }
            ]);
          } else {
            setTasks(initialTasks);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados do usuário no Supabase:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadUserData();
  }, [activeUser]);

  // =========================================================================
  // 3. Dynamic Real-Time Data Push back to Supabase on state change
  // =========================================================================
  useEffect(() => {
    if (isCampaignConfigured && activeUser && contacts.length >= 0) {
      saveContacts(activeUser.uid, contacts);
    }
  }, [contacts, isCampaignConfigured, activeUser]);

  useEffect(() => {
    if (isCampaignConfigured && activeUser && tasks.length >= 0) {
      saveTasks(activeUser.uid, tasks);
    }
  }, [tasks, isCampaignConfigured, activeUser]);

  // Helper to toggle mobile sidebar
  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  // Handle successful subscription payment (called by Checkout)
  const handlePaymentSuccess = async (userObj) => {
    setActiveUser(userObj);
    setIsAuthenticated(true);
    setSubscriptionActive(true);
    if (userObj?.uid && !isVipEmail(userObj.email)) {
      await savePaymentStatus(userObj.uid, {
        status: 'active',
        provider: 'mercadopago',
        activatedAt: new Date().toISOString()
      });
    }
  };

  // Handle campaign setup wizard completion
  const handleSetupComplete = async (params) => {
    setCampaignParams(params);

    const userCandidateId = 'dr-marcos-silva';
    setContacts([]); // Starts with absolutely 0 pre-registered contacts!

    const defaultTasks = [
      { id: 1, text: `Registrar comitê central em ${params.city}`, done: false, category: 'Administrativo' },
      { id: 2, text: `Cadastrar as primeiras 50 lideranças no CRM`, done: false, category: 'Lideranças' },
      { id: 3, text: `Gerar SWOT tático com o Mestre AI`, done: false, category: 'Estratégia' },
      { id: 4, text: `Cruzar seções eleitorais de ${params.city} do TRE-RO`, done: false, category: 'Análise' }
    ];
    setTasks(defaultTasks);

    if (typeof window !== 'undefined') {
      localStorage.setItem('campaignParams', JSON.stringify(params));
      localStorage.setItem('crmContacts', JSON.stringify([]));
      localStorage.setItem('campaignTasks', JSON.stringify(defaultTasks));
    }
    reinitializeElectoralMockData();

    setCandidates([...initialCandidates]);
    setActiveCandidate(userCandidateId);

    if (activeUser) {
      const userId = activeUser.uid;
      await saveCampaignParams(userId, params);
      await saveContacts(userId, []);
      await saveTasks(userId, defaultTasks);
    }

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
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.warn('Supabase signout warning:', e);
    }

    setIsAuthenticated(false);
    setShowCheckout(false);
    setActiveUser(null);
    setSubscriptionActive(false);
    setIsCampaignConfigured(false);
    setCampaignParams(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('activeUser');
      localStorage.removeItem('campaignParams');
      localStorage.removeItem('crmContacts');
      localStorage.removeItem('campaignTasks');
    }
    window.location.reload(); // Force reload to reinitialize state cleanly
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
      // Compatibilidade: rotas legadas redirecionam para Apuração TSE.
      case 'apuracao-tse':
      case 'analytics':
      case 'comparison':
        return (
          <ErrorBoundary label="Apuração TSE">
            <ApuracaoTSE />
          </ErrorBoundary>
        );
      case 'assistant':
        return (
          <ErrorBoundary label="Mestre AI">
            <Assistant activeCandidate={activeCandidate} />
          </ErrorBoundary>
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
  // Loading Screen (Auth Re-hydration / Loading Supabase)
  // =========================================================================
  if (isLoading) {
    return (
      <div style={{
        background: 'var(--bg-dark)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        color: '#FFFFFF',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          background: 'var(--accent-blue-glow)',
          filter: 'blur(100px)',
          borderRadius: '50%',
          opacity: 0.3,
          zIndex: 0
        }} />
        <div style={{
          border: '3px solid rgba(255, 255, 255, 0.05)',
          borderTop: '3px solid var(--accent-blue-bright)',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          animation: 'spin-rot 1s linear infinite',
          position: 'relative',
          zIndex: 1
        }} />
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.9rem',
          color: 'var(--text-gray)',
          letterSpacing: '0.05em',
          fontWeight: 600,
          position: 'relative',
          zIndex: 1
        }}>SINCRO-CARREGANDO...</p>
        <style>{`
          @keyframes spin-rot {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

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
  // Authenticated but subscription not active yet -> finish checkout
  // =========================================================================
  if (!subscriptionActive) {
    return (
      <Checkout
        initialUser={activeUser}
        onPaymentSuccess={handlePaymentSuccess}
        onBackToLanding={handleLogout}
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
        onReconfigure={() => setIsCampaignConfigured(false)}
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
          candidates={candidates}
        />

        {/* Selected Page view */}
        <main style={{ width: '100%' }}>
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}
