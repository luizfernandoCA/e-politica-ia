import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary — captura crashes de render no React e renderiza um
 * fallback útil em vez de deixar a tela em branco. Sem isso, qualquer
 * exception em uma sub-árvore quebra o app inteiro.
 *
 * Uso:
 *   <ErrorBoundary label="Análise Eleitoral">
 *     <Analytics />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log estruturado pro DevTools / Vercel logs
    console.error('[ErrorBoundary]', this.props.label || 'page', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, errorInfo } = this.state;
    const label = this.props.label || 'esta página';

    return (
      <div style={{ padding: '2rem', minHeight: '60vh' }}>
        <div
          className="glass"
          style={{
            padding: '2rem',
            border: '1px solid var(--accent-red, #EF4444)',
            borderRadius: 'var(--radius-md)',
            maxWidth: 800,
            margin: '0 auto'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}
          >
            <AlertTriangle size={28} color="#EF4444" />
            <h2
              style={{
                fontFamily: 'var(--font-title)',
                fontSize: '1.4rem',
                margin: 0
              }}
            >
              Ops, {label} encontrou um erro
            </h2>
          </div>

          <p style={{ color: 'var(--text-gray)', marginBottom: '1rem' }}>
            A tela travou. Aqui o erro técnico — copia e cola pra suporte se
            necessário:
          </p>

          <pre
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#FCA5A5',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
              fontSize: '0.8rem',
              fontFamily: 'ui-monospace, monospace',
              overflow: 'auto',
              maxHeight: 240
            }}
          >
            {String(error?.message || error || 'Erro desconhecido')}
            {errorInfo?.componentStack
              ? '\n\nComponent stack:' + errorInfo.componentStack
              : ''}
          </pre>

          <button
            onClick={this.handleReload}
            style={{
              marginTop: '1rem',
              background: 'var(--accent-green)',
              color: 'var(--bg-dark)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '0.6rem 1.1rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <RefreshCw size={16} /> Tentar de novo
          </button>
        </div>
      </div>
    );
  }
}
