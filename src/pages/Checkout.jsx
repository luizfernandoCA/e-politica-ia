import { useState, useEffect } from 'react';
import {
  Lock,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Loader2,
  Mail,
  AlertCircle,
  CheckCircle2,
  Crown
} from 'lucide-react';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  isVipEmail
} from '../services/authService';
import { authedFetch } from '../services/api';

/**
 * Checkout - real authentication (Supabase) + real payment (Mercado Pago Checkout Pro).
 *
 * Flow:
 *  1. 'auth'  - create account or sign in (email/password or Google OAuth)
 *  2. 'plan'  - confirm the subscription and pay via Mercado Pago redirect
 *               (VIP e-mails skip payment)
 *
 * No card data ever touches this application: payment happens on Mercado Pago's
 * own PCI-compliant checkout page.
 */
export default function Checkout({ onPaymentSuccess, onBackToLanding, initialUser = null }) {
  // Detect Mercado Pago return once (back_urls: /?payment=success|failure|pending)
  const [paymentReturn] = useState(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const result = params.get('payment');
    if (result) window.history.replaceState({}, '', window.location.pathname);
    return result;
  });

  const [mode, setMode] = useState('signup'); // 'signup' | 'login'
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(
    paymentReturn === 'failure'
      ? 'O pagamento não foi concluído no Mercado Pago. Você pode tentar novamente.'
      : null
  );
  const [info, setInfo] = useState(
    paymentReturn === 'pending'
      ? 'Seu pagamento está em análise no Mercado Pago. O acesso será liberado automaticamente após a aprovação.'
      : null
  );
  const [authedUser, setAuthedUser] = useState(null);

  const [form, setForm] = useState({ name: '', email: '', password: '' });

  // Derived: which account is active and which step to render
  const user = authedUser || initialUser;
  const step = user ? 'plan' : 'auth';
  const setUser = setAuthedUser;

  const isVIP = user && isVipEmail(user.email);

  // Approved payment redirect: unlock access for the authenticated user
  useEffect(() => {
    if (paymentReturn === 'success' && initialUser) {
      onPaymentSuccess(initialUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const friendlyAuthError = (err) => {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (msg.includes('already registered')) return 'Este e-mail já possui cadastro. Use a aba "Entrar".';
    if (msg.includes('password should be at least')) return 'A senha precisa ter no mínimo 6 caracteres.';
    if (msg.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar (verifique sua caixa de entrada).';
    if (msg.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    if (msg.includes('provider is not enabled')) return 'Login com Google ainda não habilitado neste ambiente. Use e-mail e senha.';
    return err?.message || 'Erro inesperado de autenticação.';
  };

  // ---------------------------------------------------------------------
  // Auth handlers (Supabase)
  // ---------------------------------------------------------------------
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const email = form.email.trim().toLowerCase();
    if (!email.includes('@') || !email.includes('.')) {
      setError('Insira um e-mail válido.');
      return;
    }
    if (form.password.length < 6) {
      setError('A senha precisa ter no mínimo 6 caracteres.');
      return;
    }
    if (mode === 'signup' && !form.name.trim()) {
      setError('Informe seu nome completo.');
      return;
    }

    setIsProcessing(true);
    try {
      if (mode === 'signup') {
        const result = await signUpWithEmail(form.name.trim(), email, form.password);
        if (result.needsEmailConfirmation) {
          setInfo(`Enviamos um link de confirmação para ${email}. Confirme seu e-mail e depois entre na aba "Entrar".`);
          setMode('login');
        } else {
          setUser(result.user);
        }
      } else {
        const result = await signInWithEmail(email, form.password);
        setUser(result.user);
      }
    } catch (err) {
      console.error('[Checkout Auth]:', err);
      setError(friendlyAuthError(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsProcessing(true);
    try {
      await signInWithGoogle(); // Redirects to Google; session restored on return
    } catch (err) {
      console.error('[Checkout Google Auth]:', err);
      setError(friendlyAuthError(err));
      setIsProcessing(false);
    }
  };

  // ---------------------------------------------------------------------
  // Payment handler (Mercado Pago Checkout Pro - server-side preference)
  // ---------------------------------------------------------------------
  const handleSubscribe = async (payMethod = 'card') => {
    if (isVIP) {
      onPaymentSuccess(user);
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      // userId/email vêm do JWT no servidor; o corpo é só dica de UX (name) +
      // o método ('card' | 'pix'). O servidor é quem define o valor.
      const response = await authedFetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: user.name, method: payMethod })
      });

      const data = await response.json();

      if (response.ok && data.init_point) {
        // Redirect to Mercado Pago's secure checkout
        window.location.href = data.init_point;
        return;
      }

      setError(
        data.message ||
        'O gateway de pagamento ainda não está configurado neste ambiente. Contate o suporte: webcamargo@gmail.com.'
      );
    } catch (err) {
      console.error('[Checkout Payment]:', err);
      setError('Não foi possível conectar ao gateway de pagamento. Verifique sua conexão e tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const inputStyle = {
    width: '100%',
    background: 'rgba(20,30,60,0.04)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 14px',
    color: '#FFFFFF',
    fontSize: '0.9rem'
  };

  const labelStyle = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-gray)',
    textAlign: 'left'
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
          borderColor: 'rgba(20,30,60,0.08)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 30px var(--accent-blue-glow)'
        }}
      >
        {/* Back Button */}
        <button
          onClick={step === 'plan' && !initialUser ? () => { setUser(null); setError(null); } : onBackToLanding}
          style={{
            background: 'transparent',
            color: 'var(--text-gray)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            fontWeight: 600,
            marginBottom: '1.5rem',
            border: 'none',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-gray)'}
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        {/* Alerts */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            textAlign: 'left',
            marginBottom: '1.25rem'
          }}>
            <AlertCircle size={18} style={{ color: '#EF4444', flexShrink: 0, marginTop: '2px' }} />
            <p style={{ fontSize: '0.78rem', color: 'var(--text-gray)', lineHeight: 1.4, margin: 0 }}>{error}</p>
          </div>
        )}
        {info && (
          <div style={{
            background: 'rgba(0, 168, 89, 0.08)',
            border: '1px solid rgba(0, 168, 89, 0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            textAlign: 'left',
            marginBottom: '1.25rem'
          }}>
            <CheckCircle2 size={18} style={{ color: 'var(--accent-green-bright, #00A859)', flexShrink: 0, marginTop: '2px' }} />
            <p style={{ fontSize: '0.78rem', color: 'var(--text-gray)', lineHeight: 1.4, margin: 0 }}>{info}</p>
          </div>
        )}

        {/* ================= STEP 1: Account (Supabase Auth) ================= */}
        {step === 'auth' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-title)', fontWeight: 800 }}>
                {mode === 'signup' ? 'Criar sua Conta' : 'Entrar na Plataforma'}
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-gray)' }}>
                {mode === 'signup'
                  ? 'Crie sua conta segura para assinar o e-politica.ia'
                  : 'Acesse sua conta para continuar'}
              </p>
            </div>

            {/* Mode tabs */}
            <div style={{ display: 'flex', background: 'rgba(20,30,60,0.04)', borderRadius: 'var(--radius-sm)', padding: '4px', gap: '4px' }}>
              {[{ id: 'signup', label: 'Criar conta' }, { id: 'login', label: 'Entrar' }].map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setMode(t.id); setError(null); }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 'calc(var(--radius-sm) - 2px)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    background: mode === t.id ? 'var(--accent-blue, #2563EB)' : 'transparent',
                    color: mode === t.id ? '#FFFFFF' : 'var(--text-gray)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Email / password form */}
            <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mode === 'signup' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={labelStyle}>Nome completo</label>
                  <input
                    type="text"
                    placeholder="Seu nome"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>E-mail</label>
                <input
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  style={inputStyle}
                  autoComplete="email"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>Senha</label>
                <input
                  type="password"
                  placeholder="Mínimo de 6 caracteres"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  style={inputStyle}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '14px 24px',
                  background: 'var(--accent-blue, #2563EB)',
                  color: '#FFFFFF',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: isProcessing ? 'wait' : 'pointer',
                  border: 'none',
                  marginTop: '4px'
                }}
              >
                {isProcessing ? (
                  <Loader2 size={20} style={{ animation: 'spin-rot 1s linear infinite' }} />
                ) : (
                  <Mail size={18} />
                )}
                {isProcessing ? 'Processando...' : (mode === 'signup' ? 'Criar conta com e-mail' : 'Entrar')}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>OU</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            </div>

            {/* Google OAuth (Supabase provider) */}
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
                border: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continuar com Google
            </button>

            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Lock size={12} /> Autenticação criptografada via Supabase Auth
            </p>
          </div>
        )}

        {/* ================= STEP 2: Plan + Mercado Pago ================= */}
        {step === 'plan' && user && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-title)', fontWeight: 800 }}>
                {isVIP ? 'Acesso VIP Liberado' : 'Ativar Assinatura'}
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-gray)' }}>
                Conectado como <strong style={{ color: 'var(--text-white)' }}>{user.email}</strong>
              </p>
            </div>

            {/* Plan card */}
            <div style={{
              border: '1px solid rgba(37, 99, 235, 0.35)',
              background: 'rgba(37, 99, 235, 0.07)',
              borderRadius: 'var(--radius-sm)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.95rem' }}>
                  <Sparkles size={16} style={{ color: 'var(--accent-yellow, #FFCC00)' }} /> Pacote Estrategista
                </span>
                <span style={{ fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: '1.25rem' }}>
                  R$ 990<span style={{ fontSize: '0.75rem', color: 'var(--text-gray)', fontWeight: 600 }}> à vista ou parcelado</span>
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-gray)', display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
                <span>💳 <strong>3x de R$ 330</strong> no cartão</span>
                <span>·</span>
                <span>⚡ <strong>R$ 841,50</strong> à vista no Pix <strong style={{ color: 'var(--accent-green-bright, #00A859)' }}>(15% off)</strong></span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  'Dashboards eleitorais com dados oficiais TSE/TRE',
                  'CRM ilimitado de lideranças e eleitores',
                  'Mestre: estrategista com Inteligência Artificial',
                  'Comparativos, relatórios e mapas de calor'
                ].map((item) => (
                  <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.8rem', color: 'var(--text-gray)' }}>
                    <CheckCircle2 size={15} style={{ color: 'var(--accent-green-bright, #00A859)', flexShrink: 0, marginTop: '1px' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            {isVIP ? (
              <button
                onClick={() => handleSubscribe('card')}
                disabled={isProcessing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, #FFCC00, #F59E0B)',
                  color: '#1F1300',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '1rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                <Crown size={20} /> Entrar com Acesso VIP
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => handleSubscribe('pix')}
                  disabled={isProcessing}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    padding: '16px 24px', background: '#00A859', color: '#FFFFFF',
                    borderRadius: 'var(--radius-sm)', fontSize: '1rem', fontWeight: 800,
                    cursor: isProcessing ? 'wait' : 'pointer', border: 'none',
                    boxShadow: '0 6px 20px rgba(0, 168, 89, 0.35)'
                  }}
                >
                  {isProcessing ? (
                    <Loader2 size={20} style={{ animation: 'spin-rot 1s linear infinite' }} />
                  ) : (
                    <Sparkles size={20} />
                  )}
                  Pagar no Pix — R$ 841,50 (15% off)
                </button>
                <button
                  onClick={() => handleSubscribe('card')}
                  disabled={isProcessing}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    padding: '16px 24px', background: '#009EE3', color: '#FFFFFF',
                    borderRadius: 'var(--radius-sm)', fontSize: '1rem', fontWeight: 800,
                    cursor: isProcessing ? 'wait' : 'pointer', border: 'none',
                    boxShadow: '0 6px 20px rgba(0, 158, 227, 0.35)'
                  }}
                >
                  {isProcessing ? (
                    <Loader2 size={20} style={{ animation: 'spin-rot 1s linear infinite' }} />
                  ) : (
                    <ShieldCheck size={20} />
                  )}
                  Pagar no cartão — 3x de R$ 330
                </button>
              </div>
            )}

            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Lock size={12} />
              {isVIP
                ? 'Conta com privilégios de acesso vitalício.'
                : 'Pagamento processado 100% no ambiente seguro do Mercado Pago (Pix, cartão e boleto). Nenhum dado de cartão passa por nossos servidores.'}
            </p>
          </div>
        )}

        <style>{`
          @keyframes spin-rot {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
