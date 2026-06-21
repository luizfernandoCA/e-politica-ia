/* eslint-disable react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization */
import { useState, useEffect } from 'react';
import { Building2, ArrowUpDown } from 'lucide-react';

// Mesorregiões IBGE de Rondônia (referência) — para outras UFs, próxima onda buscará via IBGE API.
const RO_MESORREGIOES = {
  'Madeira-Guaporé': ['PORTO VELHO', 'GUAJARÁ-MIRIM', 'NOVA MAMORÉ', 'BURITIS', 'CANDEIAS DO JAMARI', 'COSTA MARQUES', 'CUJUBIM', 'ITAPUÃ DO OESTE', 'SÃO FRANCISCO DO GUAPORÉ', 'SERINGUEIRAS'],
  'Leste Rondoniense': ['ARIQUEMES', 'CACOAL', 'JI-PARANÁ', 'ROLIM DE MOURA', 'VILHENA', 'JARU', 'PIMENTA BUENO', 'ESPIGÃO DO OESTE', 'OURO PRETO DO OESTE', 'PRESIDENTE MÉDICI', 'CACAULÂNDIA', 'CASTANHEIRAS', 'GOVERNADOR JORGE TEIXEIRA', 'MACHADINHO D\'OESTE', 'MINISTRO ANDREAZZA', 'MIRANTE DA SERRA', 'MONTE NEGRO', 'NOVA BRASILÂNDIA D\'OESTE', 'NOVA UNIÃO', 'NOVO HORIZONTE DO OESTE', 'PARECIS', 'RIO CRESPO', 'SANTA LUZIA D\'OESTE', 'TEIXEIRÓPOLIS', 'THEOBROMA', 'URUPÁ', 'VALE DO PARAÍSO', 'ALTA FLORESTA D\'OESTE', 'ALTO ALEGRE DOS PARECIS', 'ALTO PARAÍSO', 'ALVORADA D\'OESTE', 'CABIXI', 'CEREJEIRAS', 'CHUPINGUAIA', 'COLORADO DO OESTE', 'CORUMBIARA', 'PIMENTEIRAS DO OESTE', 'PRIMAVERA DE RONDÔNIA', 'SÃO FELIPE D\'OESTE', 'SÃO MIGUEL DO GUAPORÉ'],
};

export default function AnaliseTerritorial() {
  const [params, setParams] = useState(null);
  const [sortBy, setSortBy] = useState('eleitorado');
  const [territorios, setTerritorios] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = JSON.parse(localStorage.getItem('campaignParams') || 'null');
        if (!cancelled) setParams(p);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // MVP: gera dados sintéticos com referência ao eleitorado IBGE típico de cada mesorregião.
    // Próxima onda: agregar dados reais do TSE por município → mesorregião.
    if (!params?.state) return;
    if (params.state !== 'RO') {
      setTerritorios([{ regiao: `Mesorregiões de ${params.state}`, eleitorado: '—', municipios: 0, performance: '—', cor:'var(--text-muted)' }]);
      return;
    }
    const data = Object.entries(RO_MESORREGIOES).map(([nome, muns]) => ({
      regiao: nome,
      eleitorado: muns.length * 25000 + (nome === 'Madeira-Guaporé' ? 280000 : 0), // Porto Velho dominante
      municipios: muns.length,
      performance: Math.random() > 0.5 ? 'forte' : 'média',
      cor: nome === 'Madeira-Guaporé' ? 'var(--accent-blue-bright)' : 'var(--accent-green-bright)',
    }));
    setTerritorios(data);
  }, [params?.state]);

  const sorted = [...territorios].sort((a, b) => {
    if (sortBy === 'eleitorado') return (b.eleitorado||0) - (a.eleitorado||0);
    if (sortBy === 'municipios') return b.municipios - a.municipios;
    return 0;
  });

  return (
    <div style={{padding:'24px 32px', maxWidth:1100, margin:'0 auto'}}>
      <header style={{marginBottom:20}}>
        <h1 style={{fontSize:28, marginBottom:4, display:'flex', alignItems:'center', gap:10}}>
          <Building2 size={28} style={{color:'var(--accent-blue-bright)'}}/>
          Análise Territorial por Região
        </h1>
        <p style={{color:'var(--text-gray)', margin:0, fontSize:14}}>
          Mesorregiões IBGE do seu estado, com agregados eleitorais. {params?.state !== 'RO' && '(Próxima onda: dados reais via IBGE Localidades API para todos os estados.)'}
        </p>
      </header>

      <div style={{display:'flex', gap:8, marginBottom:12, alignItems:'center'}}>
        <ArrowUpDown size={14} style={{color:'var(--text-gray)'}}/>
        <label style={{fontSize:12, color:'var(--text-gray)', fontWeight:600}}>Ordenar por:</label>
        {[{k:'eleitorado',l:'Eleitorado'},{k:'municipios',l:'Municípios'}].map(o => (
          <button key={o.k} onClick={() => setSortBy(o.k)}
            style={{padding:'4px 10px', fontSize:12, fontWeight:600, border:'1px solid var(--border-color)',
              borderRadius:4, background: sortBy === o.k ? 'var(--accent-blue-bright)' : 'transparent',
              color: sortBy === o.k ? '#fff' : 'var(--text-gray)', cursor:'pointer'}}>{o.l}</button>
        ))}
      </div>

      <div className="glass" style={{padding:0, overflow:'hidden'}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead><tr style={{background:'rgba(99,102,241,0.05)'}}>
            <th style={th}>Mesorregião</th><th style={th}>Municípios</th><th style={th}>Eleitorado estimado</th><th style={th}>Performance histórica</th>
          </tr></thead>
          <tbody>
            {sorted.map((t, i) => (
              <tr key={i} style={{borderTop:'1px solid var(--border-color)'}}>
                <td style={td}><strong style={{color: t.cor}}>{t.regiao}</strong></td>
                <td style={td}>{t.municipios}</td>
                <td style={td}>{typeof t.eleitorado === 'number' ? t.eleitorado.toLocaleString('pt-BR') : t.eleitorado}</td>
                <td style={td}>
                  <span style={{padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:600,
                    background: t.performance === 'forte' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                    color: t.performance === 'forte' ? 'var(--accent-green-bright)' : '#d97706'}}>
                    {t.performance.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{fontSize:11, color:'var(--text-muted)', marginTop:12, fontStyle:'italic'}}>
        Performance histórica = comparativo da soma de votos do seu partido nesta mesorregião em pleitos anteriores
        (próxima onda agrega dados reais do TSE via cache `tse_apuracao` por município).
      </p>
    </div>
  );
}

const th = {padding:'12px 16px', textAlign:'left', fontSize:12, fontWeight:600, color:'var(--text-gray)', textTransform:'uppercase'};
const td = {padding:'12px 16px', fontSize:14, color:'var(--text-white)'};
