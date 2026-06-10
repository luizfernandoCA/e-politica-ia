import Logo from '../components/Logo';
import { ArrowLeft } from 'lucide-react';

/**
 * LegalLayout — moldura compartilhada para páginas jurídicas públicas
 * (Política de Privacidade e Termos de Uso). Renderizável sem autenticação.
 * Mecanismo: tipografia legível, largura de leitura controlada (~720px) e
 * navegação de volta para a landing, para um operador conseguir ler/imprimir
 * o documento sem login.
 */
export default function LegalLayout({ title, updatedAt, onBack, children }) {
  return (
    <div
      style={{
        background: 'var(--bg-dark)',
        minHeight: '100vh',
        color: 'var(--text-light, #E2E8F0)',
        fontFamily: 'var(--font-body)'
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          position: 'sticky',
          top: 0,
          background: 'var(--bg-dark)',
          zIndex: 10,
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'transparent',
            border: '1px solid var(--border-color)',
            color: 'var(--text-gray)',
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600
          }}
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <Logo size={30} />
      </header>

      <main
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '2.5rem 1.5rem 4rem',
          lineHeight: 1.7,
          fontSize: '0.95rem'
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-title)',
            fontSize: '2rem',
            fontWeight: 800,
            marginBottom: '0.4rem'
          }}
        >
          {title}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '2rem' }}>
          Última atualização: {updatedAt}
        </p>
        <div className="legal-body">{children}</div>
      </main>

      <footer
        style={{
          padding: '2rem 1.5rem',
          borderTop: '1px solid var(--border-color)',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}
      >
        © {new Date().getFullYear()} e-politica.ia · Plataforma privada de inteligência de
        dados eleitorais. Sem vínculo com o governo federal ou TSE.
      </footer>

      <style>{`
        .legal-body h2 {
          font-family: var(--font-title);
          font-size: 1.2rem;
          font-weight: 700;
          margin: 2rem 0 0.75rem;
          color: #FFFFFF;
        }
        .legal-body h3 {
          font-size: 1rem;
          font-weight: 700;
          margin: 1.25rem 0 0.5rem;
          color: var(--accent-blue-bright, #60A5FA);
        }
        .legal-body p { margin: 0 0 0.9rem; color: var(--text-gray, #94A3B8); }
        .legal-body ul { margin: 0 0 1rem 1.25rem; color: var(--text-gray, #94A3B8); }
        .legal-body li { margin-bottom: 0.4rem; }
        .legal-body strong { color: #FFFFFF; }
        .legal-body a { color: var(--accent-blue-bright, #60A5FA); }
      `}</style>
    </div>
  );
}
