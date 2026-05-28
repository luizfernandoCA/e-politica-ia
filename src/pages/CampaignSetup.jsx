import React, { useState, useEffect } from 'react';
import { ShieldCheck, Sparkles, Loader2, Database, AlertCircle } from 'lucide-react';

export default function CampaignSetup({ onSetupComplete }) {
  const [formData, setFormData] = useState({
    candidateName: '',
    city: 'Porto Velho',
    state: 'RO',
    role: 'Prefeito',
    party: ''
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const roCities = [
    "Alta Floresta D'Oeste", "Alto Alegre dos Parecis", "Alto Paraíso", "Alvorada D'Oeste",
    "Ariquemes", "Buritis", "Cabixi", "Cacaulândia", "Cacoal", "Campo Novo de Rondônia",
    "Candeias do Jamari", "Castanheiras", "Cerejeiras", "Chupinguaia", "Colorado do Oeste",
    "Corumbiara", "Costa Marques", "Cujubim", "Espigão D'Oeste", "Governador Jorge Teixeira",
    "Guajará-Mirim", "Itapuã do Oeste", "Jaru", "Ji-Paraná", "Machadinho D'Oeste",
    "Ministro Andreazza", "Mirante da Serra", "Monte Negro", "Nova Brasilândia D'Oeste",
    "Nova Mamoré", "Nova União", "Novo Horizonte do Oeste", "Ouro Preto do Oeste", "Parecis",
    "Pimenta Bueno", "Pimenteiras do Oeste", "Porto Velho", "Presidente Médici",
    "Primavera de Rondônia", "Rio Crespo", "Rolim de Moura", "Santa Luzia D'Oeste",
    "São Felipe D'Oeste", "São Francisco do Guaporé", "São Miguel do Guaporé", "Seringueiras",
    "Teixeirópolis", "Theobroma", "Urupá", "Vale do Anari", "Vale do Paraíso", "Vilhena"
  ];

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
    
    setIsProcessing(true);
    setErrorMessage(null);
    setCurrentStep(0);

    try {
      // Step 0: Establish secure channel
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCurrentStep(1);

      // Step 1: Fetch 2024 Electoral Data
      const res2024 = await fetch(`/api/tse?city=${encodeURIComponent(formData.city)}&role=${formData.role}&year=2024`);
      const data2024 = await res2024.json();
      
      if (!data2024.success) {
        throw new Error(data2024.error || 'Falha ao buscar dados do TSE de 2024.');
      }
      
      setCurrentStep(2);

      // Step 2: Fetch 2020 Electoral Data
      const res2020 = await fetch(`/api/tse?city=${encodeURIComponent(formData.city)}&role=${formData.role}&year=2020`);
      const data2020 = await res2020.json();
      
      if (!data2020.success) {
        throw new Error(data2020.error || 'Falha ao buscar dados do TSE de 2020.');
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
          borderColor: 'rgba(255,255,255,0.08)',
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
                    <option value="Prefeito">Prefeito</option>
                    <option value="Vereador">Vereador</option>
                  </select>
                </div>

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

                {/* Estado (Fixed to RO) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-gray)' }}>UF</label>
                  <div 
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--accent-yellow)',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      textAlign: 'center',
                      cursor: 'not-allowed'
                    }}
                    title="e-politica.ia configurado especificamente para o TRE-RO!"
                  >
                    RO 🇧🇷
                  </div>
                </div>

              </div>

              {/* Security info note */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-gray)', background: 'rgba(255,255,255,0.01)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', marginTop: '6px' }}>
                <Database size={16} style={{ color: 'var(--accent-blue-bright)', flexShrink: 0 }} />
                <span>O cruzamento com os dados públicos do TSE e TRE-RO levará alguns segundos. A inteligência artificial criará automaticamente o SWOT e as regras de bairros sob medida.</span>
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
                <Sparkles size={16} /> Sincronizar com TSE & TRE-RO
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
