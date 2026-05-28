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
import { CANDIDATES as initialCandidates, reinitializeElectoralMockData } from './data/electoralMockData';
import { CRM_CONTACTS as initialContacts, CAMPAIGN_CHECKLIST as initialTasks } from './data/crmMockData';
import { 
  saveCampaignParams, 
  getCampaignParams, 
  saveTasks, 
  getTasks, 
  saveContacts, 
  getContacts 
} from './services/dbService';

export default function App() {
  // Authentication & Onboarding States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [activeUser, setActiveUser] = useState(null); // Google Profile details
  const [isCampaignConfigured, setIsCampaignConfigured] = useState(false);
  const [campaignParams, setCampaignParams] = useState(null);
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
  // 1. Google Authentication State & Session Listener
  // =========================================================================
  useEffect(() => {
    let unsubscribe = () => {};
    async function initAuthListener() {
      try {
        const { getAuth, onAuthStateChanged } = await import('firebase/auth');
        const auth = getAuth();
        unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
            const VIP_EMAILS = ['webcamargo@gmail.com', 'sergio.augusto.olv@gmail.com'];
            const userObj = {
              uid: user.uid,
              name: user.displayName || 'Usuário',
              email: user.email,
              avatar: user.photoURL ? null : '👤',
              photoURL: user.photoURL,
              title: VIP_EMAILS.includes(user.email) 
                ? (user.email.includes('webcamargo') ? 'Gestor de Campanha' : 'Especialista Eleitoral e Assessor Parlamentar')
                : 'Assinante'
            };
            setActiveUser(userObj);
            setIsAuthenticated(true);
            if (typeof window !== 'undefined') {
              localStorage.setItem('activeUser', JSON.stringify(userObj));
            }
          } else {
            // Check if there is a local session fallback in case of manual email login
            if (typeof window !== 'undefined') {
              const cachedUser = localStorage.getItem('activeUser');
              if (cachedUser) {
                const userObj = JSON.parse(cachedUser);
                setActiveUser(userObj);
                setIsAuthenticated(true);
              } else {
                setIsLoading(false);
              }
            } else {
              setIsLoading(false);
            }
          }
        });
      } catch (err) {
        console.warn('Firebase Auth state listener running in fallback mode:', err);
        // Fallback for manual session restore
        if (typeof window !== 'undefined') {
          const cachedUser = localStorage.getItem('activeUser');
          if (cachedUser) {
            const userObj = JSON.parse(cachedUser);
            setActiveUser(userObj);
            setIsAuthenticated(true);
          } else {
            setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
      }
    }
    initAuthListener();
    return () => unsubscribe();
  }, []);

  // =========================================================================
  // 2. Fetch User Data (Firestore / Cache fallback) once authenticated
  // =========================================================================
  useEffect(() => {
    async function loadUserData() {
      if (!activeUser) return;
      setIsLoading(true);
      const userId = activeUser.uid || activeUser.email;
      
      try {
        // 1. Load Campaign parameters
        const params = await getCampaignParams(userId);
        if (params) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('campaignParams', JSON.stringify(params));
          }
          reinitializeElectoralMockData();
          setCampaignParams(params);
          setIsCampaignConfigured(true);
          
          // Re-hydrate custom candidate list with user candidate
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
              { id: 3, text: `Gerar SWOT tático com a E-Poliana AI`, done: false, category: 'Estratégia' },
              { id: 4, text: `Cruzar seções eleitorais de ${params.city} do TRE-RO`, done: false, category: 'Análise' }
            ]);
          } else {
            setTasks(initialTasks);
          }
        }
      } catch (err) {
        console.error('Error fetching user campaign details from Firestore:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadUserData();
  }, [activeUser]);

  // =========================================================================
  // 3. Dynamic Real-Time Data Push back to Firestore on state change
  // =========================================================================
  useEffect(() => {
    if (isCampaignConfigured && activeUser && contacts.length >= 0) {
      const userId = activeUser.uid || activeUser.email;
      saveContacts(userId, contacts);
    }
  }, [contacts, isCampaignConfigured, activeUser]);

  useEffect(() => {
    if (isCampaignConfigured && activeUser && tasks.length >= 0) {
      const userId = activeUser.uid || activeUser.email;
      saveTasks(userId, tasks);
    }
  }, [tasks, isCampaignConfigured, activeUser]);

  // Helper to toggle mobile sidebar
  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  // Handle successful subscription payment
  const handlePaymentSuccess = (userObj) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeUser', JSON.stringify(userObj));
    }
    setActiveUser(userObj);
    setIsAuthenticated(true);
  };

  // Handle campaign setup wizard completion
  const handleSetupComplete = async (params) => {
    setCampaignParams(params);

    const userCandidateId = 'dr-marcos-silva'; // Preserve key internally
    setContacts([]); // Starts with absolutely 0 pre-registered contacts!

    const defaultTasks = [
      { id: 1, text: `Registrar comitê central em ${params.city}`, done: false, category: 'Administrativo' },
      { id: 2, text: `Cadastrar as primeiras 50 lideranças no CRM`, done: false, category: 'Lideranças' },
      { id: 3, text: `Gerar SWOT tático com a E-Poliana AI`, done: false, category: 'Estratégia' },
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
      const userId = activeUser.uid || activeUser.email;
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
      const { getAuth, signOut } = await import('firebase/auth');
      const auth = getAuth();
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signout fallback:', e);
    }

    setIsAuthenticated(false);
    setShowCheckout(false);
    setActiveUser(null);
    setIsCampaignConfigured(false);
    setCampaignParams(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('activeUser');
      localStorage.removeItem('campaignParams');
      localStorage.removeItem('crmContacts');
      localStorage.removeItem('campaignTasks');
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
  // Loading Screen (Auth Re-hydration / Loading Firestore)
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
