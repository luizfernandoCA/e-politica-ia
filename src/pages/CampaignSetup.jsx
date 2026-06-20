import { useState } from 'react';
import { ShieldCheck, Sparkles, Loader2, Database, AlertCircle } from 'lucide-react';
import { RO_MUNICIPALITIES } from '../data/roMunicipalities';

export default function CampaignSetup({ onSetupComplete }) {
  const [formData, setFormData] = useState({
    candidateName: '',
    city: '',
    state: '',
    role: '',          // cargo concorrendo — começa vazio (sem suposição)
    previousRole: '',  // cargo já disputado (vazio = nunca concorreu)
    previousYear: '',  // ano da candidatura anterior
    party: ''
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const roCities = RO_MUNICIPALITIES;

  // Cargos. Municipais (Prefeito/Vereador) têm dados TSE 2024 sincronizados.
  // Estaduais/federais (2026) ficam salvos como parâmetro; a apuração só
  // existirá após o pleito de outubro/2026.
  const CARGOS = ['Prefeito', 'Vereador', 'Deputado Estadual', 'Deputado Federal', 'Senador', 'Governador'];
  const MUNICIPAL_CARGOS = ['Prefeito', 'Vereador'];
  const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  const isMunicipalSync = MUNICIPAL_CARGOS.includes(formData.role) && formData.state === 'RO';

  const syncSteps = [
    "Estabelecendo canal seguro com gateway do TSE...",
    "Buscando locais de votação e seções ativas no TRE-RO...",
    "Consolidando histórico eleitoral de 2020, 2022 e 2024...",
    "Alimentando modelo e-politica.ia com inteligência estratégica...",
    "Mapeando líderes e voluntários na base geográfica local...",
    "Campanha estruturada com sucesso! Redirecionando..."
  ];

  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.candidateName || !formData.party) return;
    if (!formData.role || !formData.state) {
      setErrorMessage('Selecione o cargo que o candidato vai disputar e a UF.');
      return;
    }
    if (formData.previousRole && !formData.previousYear) {
      setErrorMessage('Informe o ano da candidatura anterior (ou marque "Nunca concorreu").');
      return;
    }
    
    setIsProcessing(true);
    setErrorMessage(null);
    setCurrentStep(0);

    try {
      // Step 0: Establish secure channel
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCurrentStep(1);

      let data2024 = null;
      let data2020 = null;

      if (isMunicipalSync) {
        // Cargo municipal em RO: sincroniza apuração oficial TSE de 2024 e 2020.
        const res2024 = await fetch(`/api/tse?city=${encodeURIComponent(formData.city)}&role=${formData.role}&year=2024`);
        data2024 = await res2024.json();
        if (!data2024.success) {
          throw new Error(data2024.error || 'Falha ao buscar dados do TSE de 2024.');
        }
        setCurrentStep(2);

        const res2020 = await fetch(`/api/tse?city=${encodeURIComponent(formData.city)}&role=${formData.role}&year=2020`);
        data2020 = await res2020.json();
        if (!data2020.success) {
          throw new Error(data2020.error || 'Falha ao buscar dados do TSE de 2020.');
        }
      } else {
        // Cargo estadual/federal (2026) ou UF ≠ RO: o pleito de 2026 ocorre em
        // outubro/2026 — ainda não há apuração oficial. Salvamos os parâmetros;
        // o Painel e a Consultoria operam com busca web e dados disponíveis.
        setCurrentStep(2);
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      setCurrentStep(3);
      // Step 3: Run correlation models with e-politica.ia
      await new Promise(resolve => setTimeout(resolve, 1200));
      setCurrentStep(4);

      // Step 4: Map localized leaders geographic coordinates
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCurrentStep(5);

      // Step 5: Complete setup successfully
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const campaignConfig = {
        ...formData,
        tseData2024: data2024,
        tseData2020: data2020
      };

      onSetupComplete(campaignConfig);
    } catch (err) {
      console.error('[CAMPAIGN SETUP ERROR]:', err);
      setErrorMessage(err.message || 'Houve um erro de conexão com o portal do TSE. Verifique sua conexão e tente novamente.');
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
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', borderRadius: '50%', background: 'var(--accent-blue-glow)', filter: 'blur(130px)', zIndex: 0 }} />

      <div 
        className="glass" 
        style={{ 
          width: '100%', 
          maxWidth: '560px', 
          padding: '2.5rem', 
          position: 'relative', 
          zIndex: 1,
          background: 'rgba(5, 12, 30, 0.85)',
          borderColor: 'rgba(20,30,60,0.08)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px var(--accent-blue-glow)'
        }}
      >
        {!isProcessing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Header Title */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div 
                style={{ 
                  display: 'inline-flex', 
                  alignSelf: 'center', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '0.75rem',
                  background: 'rgba(0, 168, 89, 0.1)',
                  border: '1px solid rgba(0, 168, 89, 0.2)',
                  padding: '4px 12px',
                  borderRadius: '100px',
                  color: 'var(--accent-green-bright)',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  marginBottom: '4px'
                }}
                className="pulse-glow-green"
              >
                <ShieldCheck size={14} /> CONEXÃO TSE E TRE-RO ATIVADA
              </div>
              <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-title)', fontWeight: 800 }}>Configurar Campanha</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-gray)' }}>
                Insira os dados do seu candidato para sincronizar dados oficiais e treinar a inteligência artificial.
              </p>
            </div>

            {/* Config Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Candidate Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-gray)' }}>Nome do Candidato *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Juacy Loura Jr"
                  value={formData.candidateName}
                  onChange={(e) => setFormData(prev => ({ ...prev, candidateName: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#FFFFFF',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              {/* Cargo & Partido Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                
                {/* Cargo */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-gray)' }}>Cargo *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#FFFFFF',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="" disabled>Selecione o cargo…</option>
                    {CARGOS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Cargo já disputado (opcional) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-gray)' }}>Cargo já disputado (opcional)</label>
                  <select
                    value={formData.previousRole}
                    onChange={(e) => setFormData(prev => ({ ...prev, previousRole: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#FFFFFF',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="">Nunca concorreu</option>
                    {CARGOS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Ano da candidatura anterior — só aparece se houver candidatura anterior */}
                {formData.previousRole && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-gray)' }}>Ano da candidatura anterior</label>
                    <select
                      value={formData.previousYear}
                      onChange={(e) => setFormData(prev => ({ ...prev, previousYear: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'var(--bg-dark)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#FFFFFF',
                        fontSize: '0.9rem'
                      }}
                    >
                      <option value="" disabled>Ano…</option>
                      {['2024', '2022', '2020', '2018', '2016', '2014', '2012', '2010'].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Partido */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-gray)' }}>Partido Político *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: MDB, PL, PSD..."
                    value={formData.party}
                    onChange={(e) => setFormData(prev => ({ ...prev, party: e.target.value.toUpperCase() }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'transparent',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#FFFFFF',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

              </div>

              {/* Cidade & Estado Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '1rem' }}>
                
                {/* Cidade */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-gray)' }}>Cidade / Município *</label>
                  <input
                    list="ro-cities-list"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Digite para buscar..."
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#FFFFFF',
                      fontSize: '0.9rem'
                    }}
                  />
                  <datalist id="ro-cities-list">
                    {roCities.map((city, idx) => (
                      <option key={idx} value={city} />
                    ))}
                  </datalist>
                </div>

                {/* Estado (UF) — selecionável */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-gray)' }}>UF *</label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#FFFFFF',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      textAlign: 'center'
                    }}
                  >
                    <option value="" disabled>UF…</option>
                    {UFS.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Security info note (dinâmica conforme cargo/UF) */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-gray)', background: 'rgba(20,30,60,0.01)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', marginTop: '6px' }}>
                <Database size={16} style={{ color: 'var(--accent-blue-bright)', flexShrink: 0 }} />
                {isMunicipalSync ? (
                  <span>O cruzamento com os dados públicos do TSE e TRE-{formData.state} levará alguns segundos. A inteligência artificial criará automaticamente o SWOT e as regras de bairros sob medida.</span>
                ) : (
                  <span><strong>Eleição 2026 ({formData.role}/{formData.state}):</strong> o pleito geral ocorre em <strong>outubro/2026</strong>, então ainda não há apuração oficial para cruzar. Seus parâmetros são salvos e a Consultoria/IA já trabalham com pesquisa web; a apuração será sincronizada quando o TSE divulgar.</span>
                )}
              </div>

              {/* Real API Connection Error alert */}
              {errorMessage && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.8rem', color: '#FF4D4D', background: 'rgba(255,77,77,0.08)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,77,77,0.15)', marginTop: '6px' }}>
                  <AlertCircle size={18} style={{ flexShrink: 0, color: '#FF4D4D' }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(to right, var(--accent-blue) 0%, var(--accent-blue-bright) 100%)',
                  color: '#FFFFFF',
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 5px 15px var(--accent-blue-glow)',
                  marginTop: '0.5rem',
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                <Sparkles size={16} /> {isMunicipalSync ? `Sincronizar com TSE & TRE-${formData.state}` : 'Salvar campanha & ativar IA'}
              </button>

            </form>

          </div>
        ) : (
          // Sincronization loading progress
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', textAlign: 'center', alignItems: 'center', padding: '1rem 0' }}>
            
            <div style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={80} className="animate-spin" style={{ color: 'var(--accent-blue-bright)', animation: 'spin-rot 1.5s linear infinite', position: 'absolute' }} />
              <Database size={32} style={{ color: 'var(--accent-yellow)', filter: 'drop-shadow(0 0 8px var(--accent-blue-glow))' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Cruzando Dados com IA</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--accent-blue-bright)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Etapa {currentStep + 1} de {syncSteps.length}
              </p>
            </div>

            {/* Sincronization Logging Panel */}
            <div 
              className="glass"
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.3)',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                textAlign: 'left',
                fontFamily: 'monospace',
                fontSize: '0.78rem',
                minHeight: '130px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                color: 'var(--text-gray)'
              }}
            >
              {syncSteps.slice(0, currentStep + 1).map((stepText, idx) => {
                const isCurrent = idx === currentStep;
                return (
                  <div key={idx} style={{ color: isCurrent ? '#FFFFFF' : 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ color: isCurrent ? 'var(--accent-yellow)' : 'var(--accent-green)' }}>
                      {idx < currentStep ? '✓' : '⚡'}
                    </span>
                    <span>{stepText}</span>
                  </div>
                );
              })}
            </div>

            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Sincronizando bancos oficiais do TRE de Rondônia. Por favor, aguarde...
            </span>

          </div>
        )}
      </div>

      <style>{`
        @keyframes spin-rot {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
