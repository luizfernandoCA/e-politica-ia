import { useState } from 'react';
import { 
  Brain, 
  Map, 
  Target, 
  FileText, 
  ArrowRight, 
  Check, 
  X,
  Sparkles,
  ChevronDown,
  ShieldCheck
} from 'lucide-react';
import Logo from '../components/Logo';

export default function LandingPage({ onStartCheckout, onShowLegal }) {
  const [activeFaq, setActiveFaq] = useState(null);

  const compareList = [
    {
      feature: "Assinatura Mensal (Acesso)",
      ePolitica: "R$ 99,90",
      ePoliticaSub: "Sem taxas ocultas, acesso a todas as ferramentas",
      politique: "Mensalidade Elevada",
      politiqueSub: "Planos básicos restritivos",
      better: true
    },
    {
      feature: "Custo por Relatório Analítico",
      ePolitica: "R$ 500,00",
      ePoliticaSub: "PDF pronto para reuniões e decisões rápidas",
      politique: "Até R$ 2.000,00",
      politiqueSub: "Cobranças adicionais por exportação premium",
      better: true
    },
    {
      feature: "Estrategista de IA Integrada",
      ePolitica: "Incluso (Mestre AI)",
      ePoliticaSub: "SWOT, roteiros e discursos municipais ilimitados",
      politique: "Não Possui",
      politiqueSub: "Sem inteligência artificial nativa",
      better: true
    },
    {
      feature: "Mapeamento Espacial de Apoiadores",
      ePolitica: "Mapa de Calor Integrado",
      ePoliticaSub: "Coordenadas reais de líderes no CRM",
      politique: "Mapa Genérico",
      politiqueSub: "Visualização complexa sem foco tático",
      better: true
    }
  ];

  const faqs = [
    {
      q: "De onde vêm os dados eleitorais da plataforma?",
      a: "Nossos dados são extraídos de bases de dados públicos oficiais consolidadas do Tribunal Superior Eleitoral (TSE) e dos Tribunais Regionais (TREs). O e-politica.ia organiza e consolida essas informações geograficamente de forma visual e intuitiva."
    },
    {
      q: "Como funciona a assistente estratégico Mestre AI?",
      a: "A Mestre é uma IA treinada especificamente em marketing político, legislação eleitoral e análise estatística. Ela lê os dados de votação do seu município ou zona, detecta as oscilações de votos entre pleitos e sugere discursos, estratégias e roteiros customizados para cada bairro."
    },
    {
      q: "Posso gerenciar equipes de rua com o CRM?",
      a: "Com certeza! O Gestor de Base permite que você cadastre lideranças locais e voluntários, associe-os a bairros específicos e rastreie o tamanho da base de cada um. Os dados alimentam o Mapa de Calor em tempo real para controle do comitê central."
    },
    {
      q: "Como é cobrado o valor dos relatórios?",
      a: "O acesso completo a todos os painéis, CRM e chat IA é de apenas R$ 99,90 por mês. Se desejar exportar relatórios executivos fechados com análises complexas prontas para impressão e PDF, cada documento gerado custa R$ 500,00 — economizando até R$ 1.500,00 se comparado com agências tradicionais."
    }
  ];

  return (
    <div style={{ background: 'var(--bg-dark)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Landpage Header Navbar */}
      <nav 
        className="glass" 
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 'var(--header-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4rem',
          zIndex: 100,
          borderRadius: 0,
          background: 'rgba(255, 255, 255, 0.88)',
          borderWidth: '0 0 1px 0',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}
        ref={(el) => {
          if (el && window.innerWidth <= 768) {
            el.style.padding = '0 1.5rem';
          }
        }}
      >
        <Logo size={32} showText={true} />
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button 
            onClick={onStartCheckout}
            style={{ 
              background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-blue-bright) 100%)', 
              color: '#FFFFFF', 
              padding: '10px 24px', 
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.9rem',
              fontWeight: 700,
              boxShadow: '0 4px 15px var(--accent-blue-glow)',
              cursor: 'pointer',
              border: 'none',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.03)';
              e.currentTarget.style.boxShadow = '0 6px 20px var(--accent-blue-glow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 15px var(--accent-blue-glow)';
            }}
          >
            Cadastrar
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section 
        style={{ 
          padding: '8rem 2rem 4rem 2rem', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Glow Effects */}
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translate(-50%, -50%)', width: '400px', height: '400px', borderRadius: '50%', background: 'var(--accent-blue-glow)', filter: 'blur(100px)', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '850px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'inline-flex', alignSelf: 'center', alignItems: 'center', gap: '6px', background: 'rgba(37, 99, 235, 0.12)', border: '1px solid rgba(37, 99, 235, 0.2)', padding: '6px 14px', borderRadius: '100px', color: 'var(--accent-blue-bright)', fontSize: '0.8rem', fontWeight: 600 }} className="pulse-glow-blue">
            <Sparkles size={14} /> NOVO: MESTRE COORDENAÇÃO DE IA 2.0
          </div>

          <h1 
            style={{ 
              fontSize: '3.5rem', 
              fontFamily: 'var(--font-title)', 
              fontWeight: 800, 
              lineHeight: 1.1,
              letterSpacing: '-0.03em' 
            }}
            ref={(el) => {
              if (el && window.innerWidth <= 768) {
                el.style.fontSize = '2.25rem';
              }
            }}
          >
            A Inteligência Eleitoral que <span className="text-gradient-brasil">Ganha Eleições</span>
          </h1>

          <p 
            style={{ 
              fontSize: '1.15rem', 
              color: 'var(--text-gray)', 
              lineHeight: 1.5,
              maxWidth: '650px',
              alignSelf: 'center'
            }}
            ref={(el) => {
              if (el && window.innerWidth <= 768) {
                el.style.fontSize = '0.95rem';
              }
            }}
          >
            Acesse estatísticas consolidadas do TSE de forma simples, mapeie cabos eleitorais em mapas geográficos e use IA avançada para traçar discursos e estratégias de bairro. Tudo em uma única plataforma.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button 
              onClick={onStartCheckout}
              style={{ 
                background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-blue-bright) 100%)', 
                color: '#FFFFFF', 
                padding: '14px 28px', 
                borderRadius: 'var(--radius-md)',
                fontSize: '1rem',
                fontWeight: 700,
                boxShadow: '0 8px 24px var(--accent-blue-glow)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              Começar Agora por R$ 99,90 <ArrowRight size={18} />
            </button>
            
            <a 
              href="#compare"
              style={{ 
                background: 'rgba(20,30,60,0.03)', 
                border: '1px solid var(--border-color)',
                color: 'var(--text-white)', 
                padding: '14px 28px', 
                borderRadius: 'var(--radius-md)',
                fontSize: '1rem',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              Comparar com Politique
            </a>
          </div>

          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '1.5rem', 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)',
              marginTop: '4px' 
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ShieldCheck size={14} style={{ color: 'var(--accent-green)' }} /> Integrado a dados públicos do TSE/TRE</span>
            <span>* Sem fidelidade contratual</span>
          </div>

        </div>

        {/* Floating Mockup Dashboard Panel */}
        <div 
          className="glass animate-float" 
          style={{ 
            marginTop: '4rem', 
            width: '90%', 
            maxWidth: '900px', 
            padding: '1rem',
            background: '#ffffff',
            borderColor: 'rgba(20,30,60,0.08)',
            boxShadow: '0 30px 60px rgba(20,30,60,0.18), 0 0 40px var(--accent-blue-glow)',
            position: 'relative',
            zIndex: 1
          }}
        >
          {/* Simulated Browser Bar */}
          <div style={{ display: 'flex', gap: '6px', paddingBottom: '10px', borderBottom: '1px solid rgba(20,30,60,0.06)', marginBottom: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }}></div>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B' }}></div>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }}></div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '10px', fontFamily: 'monospace' }}>https://e-politica.ia/painel</span>
          </div>

          {/* Simulated Grid mockup screen */}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: '80px 2fr 1fr', 
              gap: '10px', 
              height: '240px',
              opacity: 0.85
            }}
            ref={(el) => {
              if (el && window.innerWidth <= 768) {
                el.style.gridTemplateColumns = '1fr';
                el.style.height = 'auto';
              }
            }}
          >
            {/* Sidebar mock */}
            <div style={{ background: '#eef1f7', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '15px', padding: '15px 0', alignItems: 'center' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-blue)' }} />
              <div style={{ width: '30px', height: '8px', borderRadius: '4px', background: 'rgba(20,30,60,0.1)' }} />
              <div style={{ width: '30px', height: '8px', borderRadius: '4px', background: 'rgba(20,30,60,0.1)' }} />
              <div style={{ width: '30px', height: '8px', borderRadius: '4px', background: 'rgba(20,30,60,0.1)' }} />
            </div>

            {/* Dashboard main mock */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Row 1 cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div className="glass" style={{ padding: '10px', height: '50px', background: 'rgba(20,30,60,0.02)' }}>
                  <div style={{ width: '30px', height: '6px', background: 'rgba(20,30,60,0.1)', marginBottom: '6px' }} />
                  <div style={{ width: '50px', height: '14px', background: 'rgba(20,30,60,0.18)', borderRadius: '2px' }} />
                </div>
                <div className="glass" style={{ padding: '10px', height: '50px', background: 'rgba(20,30,60,0.02)' }}>
                  <div style={{ width: '30px', height: '6px', background: 'rgba(20,30,60,0.1)', marginBottom: '6px' }} />
                  <div style={{ width: '45px', height: '14px', background: 'var(--accent-yellow)', borderRadius: '2px' }} />
                </div>
                <div className="glass" style={{ padding: '10px', height: '50px', background: 'rgba(20,30,60,0.02)' }}>
                  <div style={{ width: '30px', height: '6px', background: 'rgba(20,30,60,0.1)', marginBottom: '6px' }} />
                  <div style={{ width: '40px', height: '14px', background: 'var(--accent-green)', borderRadius: '2px' }} />
                </div>
              </div>
              
              {/* Graphic mock */}
              <div className="glass" style={{ flexGrow: 1, padding: '15px', background: 'rgba(20,30,60,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ width: '120px', height: '8px', background: 'rgba(20,30,60,0.1)' }} />
                {/* SVG mock line */}
                <svg width="100%" height="60" viewBox="0 0 100 20" style={{ overflow: 'visible' }}>
                  <path d="M0 18 Q20 5, 40 12 T80 2 T100 15" fill="none" stroke="var(--accent-blue-bright)" strokeWidth="2" />
                  <path d="M0 18 Q20 5, 40 12 T80 2 T100 15 L100 20 L0 20 Z" fill="rgba(37, 99, 235, 0.1)" />
                </svg>
              </div>
            </div>

            {/* AI Strategic mock */}
            <div className="glass" style={{ padding: '15px', background: '#eef1f7', border: '1px solid rgba(20,30,60,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--accent-yellow)' }} />
                <div style={{ width: '80px', height: '6px', background: 'rgba(20,30,60,0.18)' }} />
              </div>
              <div style={{ width: '100%', height: '2px', background: 'rgba(20,30,60,0.05)' }} />
              <div style={{ width: '100%', height: '8px', background: 'rgba(20,30,60,0.05)', borderRadius: '2px' }} />
              <div style={{ width: '85%', height: '8px', background: 'rgba(20,30,60,0.05)', borderRadius: '2px' }} />
              <div style={{ width: '90%', height: '8px', background: 'rgba(20,30,60,0.05)', borderRadius: '2px' }} />
              <div style={{ width: '60%', height: '8px', background: 'rgba(20,30,60,0.05)', borderRadius: '2px', marginTop: '10px' }} />
            </div>
          </div>
        </div>

      </section>

      {/* Feature grid Section */}
      <section style={{ padding: '4rem 2rem', borderTop: '1px solid var(--border-color)', background: '#eef1f7' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-title)', fontWeight: 800 }}>Tudo o que sua Campanha Precisa</h2>
            <p style={{ color: 'var(--text-gray)', fontSize: '0.95rem' }}>Ferramentas completas de inteligência e mobilização de rua.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            
            {/* Feature 1: AI */}
            <div className="glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'rgba(255, 204, 0, 0.1)', padding: '10px', borderRadius: '50%', color: 'var(--accent-yellow)', alignSelf: 'flex-start' }}>
                <Brain size={24} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Mestre AI</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-gray)', lineHeight: 1.5 }}>
                Inteligência Artificial que analisa seu histórico eleitoral e escreve discursos, SWOTs e roteiros específicos por bairro.
              </p>
            </div>

            {/* Feature 2: Map */}
            <div className="glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'rgba(37, 99, 235, 0.1)', padding: '10px', borderRadius: '50%', color: 'var(--accent-blue-bright)', alignSelf: 'flex-start' }}>
                <Map size={24} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Mapa Eleitoral TSE</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-gray)', lineHeight: 1.5 }}>
                Navegue pelas seções eleitorais de Serra Dourada em mapas interativos e veja onde se concentram seus votos.
              </p>
            </div>

            {/* Feature 3: CRM */}
            <div className="glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'rgba(0, 168, 89, 0.1)', padding: '10px', borderRadius: '50%', color: 'var(--accent-green-bright)', alignSelf: 'flex-start' }}>
                <Target size={24} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Gestão de Lideranças</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-gray)', lineHeight: 1.5 }}>
                Mapeie seus cabos eleitorais e voluntários geograficamente em um mapa de calor, medindo o alcance da sua base.
              </p>
            </div>

            {/* Feature 4: PDF */}
            <div className="glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'rgba(37,99,235,0.1)', padding: '10px', borderRadius: '50%', color: 'var(--accent-blue-bright)', alignSelf: 'flex-start' }}>
                <FileText size={24} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Relatórios Rápidos</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-gray)', lineHeight: 1.5 }}>
                Gere e imprima dossiês analíticos completos de planejamento de campanha formatados profissionalmente para PDF.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing and Comparison Table Section */}
      <section id="compare" style={{ padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2 style={{ fontSize: '2.25rem', fontFamily: 'var(--font-title)', fontWeight: 800 }}>
              Comparativo Real: <span className="text-gradient-brasil">e-politica.ia vs Politique</span>
            </h2>
            <p style={{ color: 'var(--text-gray)', fontSize: '1rem', maxWidth: '600px', alignSelf: 'center' }}>
              Por que pagar milhares de reais se você pode ter inteligência artificial e mapas integrados por uma fração do preço?
            </p>
          </div>

          {/* Pricing Grid */}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '1.5rem' 
            }}
            ref={(el) => {
              if (el && window.innerWidth <= 768) {
                el.style.gridTemplateColumns = '1fr';
              }
            }}
          >
            {/* e-politica card (Winner!) */}
            <div 
              className="glass" 
              style={{ 
                padding: '2.5rem', 
                border: '2px solid var(--accent-blue-bright)', 
                boxShadow: '0 0 25px var(--accent-blue-glow)',
                position: 'relative',
                background: 'rgba(37, 99, 235, 0.05)'
              }}
            >
              <div style={{ position: 'absolute', top: '15px', right: '15px', background: 'var(--accent-blue)', color: '#FFF', fontSize: '0.65rem', fontWeight: 800, padding: '3px 10px', borderRadius: '100px', letterSpacing: '0.05em', textTransform: 'uppercase' }} className="pulse-glow-blue">
                Recomendado
              </div>

              <span style={{ fontSize: '0.8rem', color: 'var(--accent-blue-bright)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>e-politica.ia</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '8px 0 1.5rem 0' }}>
                <span style={{ fontSize: '1.25rem', color: 'var(--text-gray)', fontWeight: 500 }}>R$</span>
                <span style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-white)', fontFamily: 'var(--font-title)', lineHeight: 1 }}>99,90</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-gray)', fontWeight: 500 }}>/mês</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.85rem' }}>
                  <Check size={16} style={{ color: 'var(--accent-green)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Acesso Total Sem Restrições</strong>
                    <span style={{ display: 'block', color: 'var(--text-gray)', fontSize: '0.75rem' }}>Use o CRM, os mapas e o comparativo livremente.</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.85rem' }}>
                  <Check size={16} style={{ color: 'var(--accent-green)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Estrategista Mestre AI</strong>
                    <span style={{ display: 'block', color: 'var(--text-gray)', fontSize: '0.75rem' }}>Roteiros de discursos e SWOT municipais inclusos.</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.85rem' }}>
                  <Check size={16} style={{ color: 'var(--accent-green)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Relatório Profissional por R$ 500,00</strong>
                    <span style={{ display: 'block', color: 'var(--text-gray)', fontSize: '0.75rem' }}>Dossiê pronto para impressão de alta fidelidade.</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={onStartCheckout}
                style={{ 
                  width: '100%', 
                  background: 'linear-gradient(to right, var(--accent-blue), var(--accent-blue-bright))', 
                  color: '#FFFFFF', 
                  padding: '14px', 
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  marginTop: '2.5rem',
                  boxShadow: '0 5px 15px var(--accent-blue-glow)'
                }}
              >
                Assinar Agora por R$ 99,90
              </button>
            </div>

            {/* Politique card (Traditional) */}
            <div className="glass" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', opacity: 0.75 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-gray)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Plataformas Tradicionais</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '8px 0 1.5rem 0' }}>
                <span style={{ fontSize: '1rem', color: 'var(--text-gray)' }}>Mensalidades Altas</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', flexGrow: 1 }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.85rem' }}>
                  <X size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: 'var(--text-white)' }}>Planos Básicos Limitados</strong>
                    <span style={{ display: 'block', color: 'var(--text-gray)', fontSize: '0.75rem' }}>Funcionalidades essenciais travadas sob upgrade.</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.85rem' }}>
                  <X size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: 'var(--text-white)' }}>Sem Inteligência Artificial de Série</strong>
                    <span style={{ display: 'block', color: 'var(--text-gray)', fontSize: '0.75rem' }}>Sem assistente de discursos ou diagnóstico virtual.</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.85rem' }}>
                  <X size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: 'var(--text-white)' }}>Relatórios de Até R$ 2.000,00</strong>
                    <span style={{ display: 'block', color: 'var(--text-gray)', fontSize: '0.75rem' }}>Cobrança exorbitante por dados estáticos de agências.</span>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2.5rem', fontStyle: 'italic' }}>
                Plataformas concorrentes cobram até 10 vezes mais pelas mesmas ferramentas.
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="glass" style={{ padding: '2rem', overflowX: 'auto', border: '1px solid rgba(20,30,60,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-gray)' }}>
                  <th style={{ padding: '12px' }}>Funcionalidade</th>
                  <th style={{ padding: '12px', color: 'var(--accent-blue-bright)', fontWeight: 700 }}>e-politica.ia</th>
                  <th style={{ padding: '12px' }}>Outras (ex: Politique)</th>
                </tr>
              </thead>
              <tbody>
                {compareList.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(20,30,60,0.03)' }}>
                    <td style={{ padding: '16px 12px', fontWeight: 600, color: 'var(--text-white)' }}>{row.feature}</td>
                    <td style={{ padding: '16px 12px' }}>
                      <strong style={{ color: 'var(--accent-blue-bright)', display: 'block' }}>{row.ePolitica}</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-gray)', display: 'block', marginTop: '2px' }}>{row.ePoliticaSub}</span>
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <span style={{ color: 'var(--text-white)', display: 'block' }}>{row.politique}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>{row.politiqueSub}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: '4rem 2rem', background: '#eef1f7' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-title)', fontWeight: 800, textAlign: 'center' }}>
            Quem Usa, <span className="text-gradient-brasil">Recomenda</span>
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }} ref={(el) => { if (el && window.innerWidth <= 768) el.style.gridTemplateColumns = '1fr'; }}>
            <div className="glass" style={{ padding: '2rem', borderLeft: '4px solid var(--accent-blue-bright)' }}>
              <p style={{ fontStyle: 'italic', fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text-white)' }}>
                "O e-politica.ia revolucionou nossa abordagem jurídica e tática. A precisão no cruzamento de dados públicos do TSE e o mapa de calor de lideranças nos permitem orientar as candidaturas de forma cirúrgica, focando a mobilização onde há real potencial de crescimento. A economia frente ao Politique é impressionante!"
              </p>
              <div style={{ marginTop: '1.25rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '1.5rem' }}>👨‍⚖️</span>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-white)', display: 'block' }}>Dr. Juacy Loura Jr.</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-gray)' }}>Ex-Juiz do TRE e Advogado Eleitoral</span>
                </div>
              </div>
            </div>

            <div className="glass" style={{ padding: '2rem', borderLeft: '4px solid var(--accent-yellow)' }}>
              <p style={{ fontStyle: 'italic', fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text-white)' }}>
                "O Mestre AI superou todas as minhas expectativas no dia a dia parlamentar e de campanha. Poder gerar discursos táticos, análises SWOT e diagnósticos de bairro consolidados em menos de 30 segundos, direto pelo celular, é uma vantagem competitiva inestimável. Um divisor de águas!"
              </p>
              <div style={{ marginTop: '1.25rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '1.5rem' }}>👨‍💼</span>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-white)', display: 'block' }}>Sergio Augusto</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-gray)' }}>Especialista Eleitoral e Assessor Parlamentar</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Accordion FAQ Section */}
      <section style={{ padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-title)', fontWeight: 800, textAlign: 'center' }}>Perguntas Frequentes</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div 
                  key={idx}
                  className="glass" 
                  style={{ 
                    padding: '1.25rem 1.5rem', 
                    cursor: 'pointer',
                    background: isOpen ? 'rgba(20,30,60,0.02)' : 'var(--bg-card)'
                  }}
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-white)' }}>{faq.q}</strong>
                    <ChevronDown size={18} style={{ color: 'var(--text-gray)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                  </div>
                  
                  {isOpen && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-gray)', lineHeight: 1.5, marginTop: '10px', borderTop: '1px solid rgba(20,30,60,0.05)', paddingTop: '10px' }}>
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Call to Action Footer */}
      <section style={{ padding: '6rem 2rem', background: 'linear-gradient(to bottom, rgba(5,12,30,0) 0%, rgba(37,99,235,0.1) 100%)', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-title)', fontWeight: 800 }}>Dê o Passo Decisivo Rumo à Vitória</h2>
          <p style={{ color: 'var(--text-gray)', fontSize: '1rem', maxWidth: '500px' }}>
            Garanta agora mesmo o acesso total ao estrategista digital mais moderno e mais barato do Brasil. 
          </p>
          <button 
            onClick={onStartCheckout}
            style={{ 
              background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-blue-bright) 100%)', 
              color: '#FFFFFF', 
              padding: '16px 36px', 
              borderRadius: 'var(--radius-md)',
              fontSize: '1.1rem',
              fontWeight: 700,
              boxShadow: '0 8px 24px var(--accent-blue-glow)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginTop: '1rem'
            }}
          >
            Assinar Plano por R$ 99,90 <ArrowRight size={18} />
          </button>
          
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assinatura mensal recorrente. Cancele quando quiser.</span>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '2rem', borderTop: '1px solid var(--border-color)', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a
            href="#/privacidade"
            onClick={(e) => { e.preventDefault(); onShowLegal && onShowLegal('privacidade'); }}
            style={{ color: 'var(--text-gray)', textDecoration: 'none', fontWeight: 600 }}
          >
            Política de Privacidade
          </a>
          <a
            href="#/termos"
            onClick={(e) => { e.preventDefault(); onShowLegal && onShowLegal('termos'); }}
            style={{ color: 'var(--text-gray)', textDecoration: 'none', fontWeight: 600 }}
          >
            Termos de Uso
          </a>
          <a
            href="mailto:contato@e-politica.ia"
            style={{ color: 'var(--text-gray)', textDecoration: 'none', fontWeight: 600 }}
          >
            Contato
          </a>
        </div>
        <span>© {new Date().getFullYear()} e-politica.ia. Plataforma privada de inteligência de dados eleitorais. Sem vínculo com o governo federal ou TSE.</span>
      </footer>

    </div>
  );
}
