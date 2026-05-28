import React, { useState } from 'react';
import { 
  CreditCard, 
  Lock, 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles,
  Loader2,
  Mail,
  AlertCircle
} from 'lucide-react';

export default function Checkout({ onPaymentSuccess, onBackToLanding }) {
  const [step, setStep] = useState('google'); // 'google' or 'card'
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeInput, setActiveInput] = useState('front'); // 'front' or 'back' for card flip
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [showEmailField, setShowEmailField] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Credit card form states
  const [cardDetails, setCardDetails] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: ''
  });

  const [selectedUser, setSelectedUser] = useState(null);

  // VIP emails that get free access
  const VIP_EMAILS = ['webcamargo@gmail.com', 'sergio.augusto.olv@gmail.com'];

  const isVIP = selectedUser && VIP_EMAILS.includes(selectedUser.email);

  // Format Card Number (adds spaces every 4 digits)
  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.substring(0, 16);
    let formatted = value.match(/.{1,4}/g)?.join(' ') || value;
    setCardDetails(prev => ({ ...prev, number: formatted }));
  };

  // Format Expiry MM/AA
  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.substring(0, 4);
    if (value.length > 2) {
      value = `${value.substring(0, 2)}/${value.substring(2)}`;
    }
    setCardDetails(prev => ({ ...prev, expiry: value }));
  };

  // Handle Google Sign In (Firebase Auth or fallback)
  const handleGoogleSignIn = async () => {
    setIsProcessing(true);
    setAuthError(null);
    try {
      // Try Firebase Auth
      const { getAuth, signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
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
      
      setSelectedUser(userObj);
      setStep('card');
    } catch (firebaseError) {
      console.error('Google Sign In error:', firebaseError);
      let friendlyMessage = '';
      if (firebaseError.code === 'auth/unauthorized-domain') {
        friendlyMessage = 'Este domínio (e-politica-ia.vercel.app) não está autorizado no Console do Firebase. Adicione-o em Autenticação -> Configurações -> Domínios Autorizados no Firebase para habilitar a API do Google.';
      } else if (firebaseError.code === 'auth/popup-blocked') {
        friendlyMessage = 'O pop-up de login foi bloqueado pelo seu navegador. Por favor, libere os pop-ups para este site e tente novamente.';
      } else if (firebaseError.message && firebaseError.message.includes('No Firebase App')) {
        friendlyMessage = 'Chaves do Firebase não configuradas localmente. Use o e-mail manual para demonstração.';
      } else {
        friendlyMessage = firebaseError.message || 'Erro desconhecido ao conectar com a API do Google.';
      }
      setAuthError(friendlyMessage);
      setShowEmailField(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle manual email login (fallback when Firebase is not configured)
  const handleEmailLogin = () => {
    const trimmedEmail = emailInput.trim().toLowerCase();
    
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setEmailError('Insira um e-mail válido');
      return;
    }

    setEmailError('');
    const isVipEmail = VIP_EMAILS.includes(trimmedEmail);
    
    const userObj = {
      uid: trimmedEmail,
      name: isVipEmail 
        ? (trimmedEmail.includes('webcamargo') ? 'Luiz Fernando' : 'Sergio Augusto')
        : trimmedEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      email: trimmedEmail,
      avatar: isVipEmail 
        ? (trimmedEmail.includes('webcamargo') ? '👨‍💼' : '👨‍💼')
        : '👤',
      title: isVipEmail 
        ? (trimmedEmail.includes('webcamargo') ? 'Gestor de Campanha' : 'Especialista Eleitoral e Assessor Parlamentar')
        : 'Assinante'
    };

    setSelectedUser(userObj);
    setStep('card');
  };

  // Submit payment form
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!cardDetails.number || !cardDetails.name || !cardDetails.expiry || !cardDetails.cvv) return;

    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.uid || selectedUser.email,
          email: selectedUser.email,
          cardName: cardDetails.name,
          cardNumber: cardDetails.number,
          cardExpiry: cardDetails.expiry,
          amount: 99.90
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Successful checkout! Sincronize status via onPaymentSuccess
        onPaymentSuccess(selectedUser);
      } else {
        alert(data.message || 'Erro ao processar pagamento. Verifique seus dados.');
      }
    } catch (err) {
      console.warn('Erro ao chamar API de Checkout, usando processamento local:', err);
      // Fallback in case of serverless environment is offline
      setTimeout(() => {
        onPaymentSuccess(selectedUser);
      }, 2000);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      style={{ 
        background: 'var(--bg-dark)', 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '2rem',
        position: 'relative'
      }}
    >
      {/* Background Glow */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '500px', height: '500px', borderRadius: '50%', background: 'var(--accent-blue-glow)', filter: 'blur(120px)', zIndex: 0 }} />

      <div 
        className="glass" 
        style={{ 
          width: '100%', 
          maxWidth: '520px', 
          padding: '2.5rem', 
          position: 'relative', 
          zIndex: 1,
          background: 'rgba(5, 12, 30, 0.75)',
          borderColor: 'rgba(255,255,255,0.08)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 30px var(--accent-blue-glow)'
        }}
      >
        
        {/* Back Button */}
        <button
          onClick={step === 'card' ? () => { setStep('google'); setSelectedUser(null); setShowEmailField(false); } : onBackToLanding}
          style={{
            background: 'transparent',
            color: 'var(--text-gray)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            fontWeight: 600,
            marginBottom: '1.5rem'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-gray)'}
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        {/* STEP 1: Google Login */}
        {step === 'google' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-title)', fontWeight: 800 }}>Criar sua Conta</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-gray)' }}>
                Entre com sua conta Google para começar a usar o e-politica.ia
              </p>
            </div>

            {authError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                textAlign: 'left',
                boxShadow: '0 0 15px rgba(239, 68, 68, 0.05)',
                position: 'relative'
              }}>
                <AlertCircle size={18} style={{ color: '#EF4444', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#EF4444' }}>Problema de Conexão com Google Auth</span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-gray)', lineHeight: '1.4', margin: 0 }}>
                    {authError}
                  </p>
                </div>
              </div>
            )}

            {/* Google Sign-In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isProcessing}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '14px 24px',
                background: '#FFFFFF',
                color: '#1F1F1F',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: isProcessing ? 'wait' : 'pointer',
                transition: 'all var(--transition-fast)',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
              onMouseEnter={(e) => { if (!isProcessing) { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'; e.currentTarget.style.transform = 'none'; }}
            >
              {isProcessing ? (
                <Loader2 size={20} style={{ animation: 'spin-rot 1s linear infinite', color: '#666' }} />
              ) : (
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
              )}
              {isProcessing ? 'Conectando...' : 'Entrar com Google'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>OU</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            </div>

            {/* Email Fallback */}
            {!showEmailField ? (
              <button
                onClick={() => setShowEmailField(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  color: 'var(--text-gray)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = 'var(--accent-blue-bright)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-gray)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
              >
                <Mail size={16} /> Usar e-mail manualmente
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-gray)', textAlign: 'left' }}>E-mail da conta Google</label>
                  <input
                    type="email"
                    placeholder="seuemail@gmail.com"
                    value={emailInput}
                    onChange={(e) => { setEmailInput(e.target.value); setEmailError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                    autoFocus
                    style={{ width: '100%' }}
                  />
                  {emailError && (
                    <span style={{ fontSize: '0.72rem', color: '#EF4444', textAlign: 'left' }}>{emailError}</span>
                  )}
                </div>
                <button
                  onClick={handleEmailLogin}
                  style={{
                    background: 'linear-gradient(to right, var(--accent-blue) 0%, var(--accent-blue-bright) 100%)',
                    color: '#FFFFFF',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    border: 'none',
                    boxShadow: '0 4px 12px var(--accent-blue-glow)'
                  }}
                >
                  Continuar
                </button>
              </div>
            )}
            
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>
              Ao prosseguir, você concorda com os termos de privacidade do e-politica.ia. Autenticação segura via OAuth 2.0.
            </span>
          </div>
        )}

        {/* STEP 2: Credit Card Payment Module */}
        {step === 'card' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {isVIP ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center', alignItems: 'center' }}>
                <div style={{ background: 'rgba(0, 168, 89, 0.1)', border: '1px solid rgba(0, 168, 89, 0.3)', padding: '6px 14px', borderRadius: '100px', color: 'var(--accent-green-bright)', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.05em' }}>
                  🌟 PARCEIRO VIP DETECTADO
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-title)', fontWeight: 800, color: '#FFFFFF' }}>Acesso Gratuito Liberado!</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-gray)', maxWidth: '400px', margin: '0 auto', lineHeight: 1.4 }}>
                    Olá, <strong style={{ color: 'var(--accent-blue-bright)' }}>{selectedUser.name}</strong>. Sincronizamos seu e-mail <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: '#FFF' }}>{selectedUser.email}</code> com nossa base de cortesia VIP.
                  </p>
                </div>

                {/* Glowing Premium VIP Card Graphic */}
                <div 
                  className="glass animate-float"
                  style={{
                    width: '100%',
                    maxWidth: '360px',
                    padding: '2rem 1.5rem',
                    background: 'linear-gradient(135deg, rgba(7, 31, 19, 0.8) 0%, rgba(5, 12, 30, 0.8) 100%)',
                    border: '1.5px solid var(--accent-yellow)',
                    borderRadius: '12px',
                    boxShadow: '0 15px 35px rgba(0,0,0,0.6), 0 0 25px rgba(255, 204, 0, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    margin: '0.5rem 0'
                  }}
                >
                  <span style={{ fontSize: '3rem' }}>👑</span>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-yellow)' }}>CONTA VIP CORTESIA</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-gray)', display: 'block', marginTop: '2px' }}>e-politica.ia Premium</span>
                  </div>
                  
                  <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.72rem', textAlign: 'left' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Assinante:</span>
                      <strong style={{ color: '#FFF' }}>{selectedUser.name}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Mensalidade:</span>
                      <strong style={{ color: 'var(--accent-green-bright)' }}>R$ 0,00 (Gratuito)</strong>
                    </div>
                  </div>
                </div>

                {/* Direct Unlock Button */}
                <button
                  onClick={() => {
                    setIsProcessing(true);
                    setTimeout(() => {
                      setIsProcessing(false);
                      onPaymentSuccess(selectedUser);
                    }, 1200);
                  }}
                  disabled={isProcessing}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(to right, var(--accent-green) 0%, var(--accent-green-bright) 100%)',
                    color: '#FFFFFF',
                    padding: '14px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 5px 15px rgba(0, 168, 89, 0.3)',
                    cursor: 'pointer',
                    marginTop: '0.5rem',
                    border: 'none'
                  }}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={18} style={{ animation: 'spin-rot 1s linear infinite' }} />
                      Liberando Acesso Premium...
                    </>
                  ) : (
                    <>Acessar Dashboard Gratuito</>
                  )}
                </button>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-title)', fontWeight: 800 }}>Confirmar Assinatura</h2>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-gray)' }}>
                    Assinatura Recorrente: <strong style={{ color: 'var(--accent-blue-bright)' }}>R$ 99,90/mês</strong>
                  </span>
                  {selectedUser && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Conta: {selectedUser.email}
                    </span>
                  )}
                </div>

                {/* Interactive Flipped Credit Card Preview */}
                <div style={{ perspective: '1000px', width: '100%', height: '170px', margin: '0.5rem 0' }}>
                  <div 
                    style={{
                      width: '100%',
                      height: '100%',
                      position: 'relative',
                      transformStyle: 'preserve-3d',
                      transition: 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      transform: activeInput === 'back' ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                  >
                    {/* CARD FRONT PANEL */}
                    <div 
                      className="glass"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        background: 'linear-gradient(135deg, hsl(222, 60%, 12%) 0%, hsl(222, 60%, 6%) 100%)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        padding: '1.25rem 1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        borderRadius: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {/* Glowing Gold Chip */}
                        <div style={{ width: '36px', height: '26px', background: 'linear-gradient(135deg, #FFE066 0%, #D4AF37 100%)', borderRadius: '4px', position: 'relative', border: '1px solid rgba(0,0,0,0.1)' }}>
                          <div style={{ position: 'absolute', inset: '4px', border: '1.5px solid rgba(0,0,0,0.15)', borderRadius: '2px' }} />
                        </div>
                        <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-title)', fontWeight: 800, color: 'var(--accent-blue-bright)', letterSpacing: '0.05em' }}>
                          e-politica.ia
                        </span>
                      </div>

                      {/* Card Number display */}
                      <div style={{ fontSize: '1.35rem', fontFamily: 'monospace', letterSpacing: '0.15em', fontWeight: 600, color: '#FFFFFF', textAlign: 'center', margin: '0.75rem 0' }}>
                        {cardDetails.number || '•••• •••• •••• ••••'}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <div style={{ maxWidth: '70%' }}>
                          <span style={{ fontSize: '0.55rem', color: 'var(--text-gray)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Titular</span>
                          <span style={{ fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                            {cardDetails.name || 'NOME DO TITULAR'}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.55rem', color: 'var(--text-gray)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Validade</span>
                          <span style={{ fontWeight: 600 }}>{cardDetails.expiry || 'MM/AA'}</span>
                        </div>
                      </div>
                    </div>

                    {/* CARD BACK PANEL */}
                    <div 
                      className="glass"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        background: 'linear-gradient(135deg, hsl(222, 60%, 8%) 0%, hsl(222, 60%, 4%) 100%)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        padding: '1.25rem 0',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        borderRadius: '12px'
                      }}
                    >
                      {/* Magnetic Strip */}
                      <div style={{ width: '100%', height: '36px', background: '#000000', marginTop: '5px' }} />
                      
                      {/* CVV Box panel */}
                      <div style={{ padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '0.55rem', color: 'var(--text-gray)', textTransform: 'uppercase', fontWeight: 600 }}>Código de Segurança (CVV)</span>
                        <div style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
                          <div style={{ width: '75%', height: '28px', background: '#FFFFFF', borderRadius: '3px' }} />
                          <div style={{ width: '25%', height: '28px', background: 'rgba(255,255,255,0.1)', color: 'var(--accent-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.9rem', borderRadius: '0 3px 3px 0' }}>
                            {cardDetails.cvv || '•••'}
                          </div>
                        </div>
                      </div>

                      <div style={{ padding: '0 1.5rem', fontSize: '0.55rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                        Sincronização SSL Segura de 256 bits. e-politica.ia
                      </div>
                    </div>
                  </div>
                </div>

                {/* Billing Checkout Form */}
                <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Cardholder Name */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-gray)' }}>Nome Impresso no Cartão *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Nome como está no cartão"
                      value={cardDetails.name}
                      onChange={(e) => setCardDetails(prev => ({ ...prev, name: e.target.value }))}
                      onFocus={() => setActiveInput('front')}
                      disabled={isProcessing}
                    />
                  </div>

                  {/* Card Number */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-gray)' }}>Número do Cartão *</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        required
                        placeholder="0000 0000 0000 0000"
                        value={cardDetails.number}
                        onChange={handleCardNumberChange}
                        onFocus={() => setActiveInput('front')}
                        style={{ width: '100%', paddingLeft: '2.5rem' }}
                        disabled={isProcessing}
                      />
                      <CreditCard size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-gray)' }} />
                    </div>
                  </div>

                  {/* Grid MM/AA and CVV */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-gray)' }}>Validade (MM/AA) *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="MM/AA"
                        value={cardDetails.expiry}
                        onChange={handleExpiryChange}
                        onFocus={() => setActiveInput('front')}
                        disabled={isProcessing}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-gray)' }}>CVC / CVV *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="000"
                        maxLength="3"
                        value={cardDetails.cvv}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').substring(0, 3);
                          setCardDetails(prev => ({ ...prev, cvv: val }));
                        }}
                        onFocus={() => setActiveInput('back')}
                        onBlur={() => setActiveInput('front')}
                        disabled={isProcessing}
                      />
                    </div>
                  </div>

                  {/* Billing Info Security badge */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-gray)', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', marginTop: '4px' }}>
                    <ShieldCheck size={16} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
                    <span>Seu pagamento está seguro e encriptado. Processamento via SSL 256-bit.</span>
                  </div>

                  {/* Submit Checkout button */}
                  <button
                    type="submit"
                    disabled={isProcessing || !cardDetails.number || !cardDetails.name || !cardDetails.expiry || !cardDetails.cvv}
                    style={{
                      background: isProcessing ? 'rgba(255,255,255,0.04)' : 'linear-gradient(to right, var(--accent-blue) 0%, var(--accent-blue-bright) 100%)',
                      color: isProcessing ? 'var(--text-muted)' : '#FFFFFF',
                      padding: '14px',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 700,
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: isProcessing ? 'none' : '0 5px 15px var(--accent-blue-glow)',
                      marginTop: '0.5rem',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      border: 'none'
                    }}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={18} style={{ animation: 'spin-rot 1s linear infinite' }} />
                        Processando Assinatura...
                      </>
                    ) : (
                      <>
                        <Lock size={16} /> Confirmar Assinatura por R$ 99,90
                      </>
                    )}
                  </button>

                </form>
              </>
            )}
          </div>
        )}

      </div>

      {/* Embedded rotating spin loader styles */}
      <style>{`
        @keyframes spin-rot {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
