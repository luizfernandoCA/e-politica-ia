/* eslint-disable react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization */
import { useState, useEffect, useCallback } from 'react';
import { Building2 } from 'lucide-react';

/**
 * Análise Territorial por Região (refeito no Ajuste #5).
 * Carrega TODAS as macrorregiões/mesorregiões da UF via IBGE Localidades v1.
 * Endpoint: https://servicodados.ibge.gov.br/api/v1/localidades/estados/{UF}/mesorregioes
 */
export default function AnaliseTerritorial() {
  const [params, setParams] = useState(null);
  const [mesos, setMesos] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = JSON.parse(localStorage.getItem('campaignParams') || 'null');
        if (!cancelled) setParams(p);
      } catch { /* */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const load = useCallback(async () => {
    if (!params?.state) return;
    setLoading(true); setError(null);
    try {
      const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${params.state}/mesorregioes`);
      if (!r.ok) throw new Error(`IBGE ${r.status}`);
      const data = await r.json();
      // Carregar municípios por mesorregião pra contagem
      const enriched = await Promise.all(data.map(async meso => {
        try {
          const rm = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/mesorregioes/${meso.id}/municipios`);
          const mlist = rm.ok ? await rm.json() : [];
          return { id: meso.id, nome: meso.nome, municipios: mlist.length };
        } catch { return { id: meso.id, nome: meso.nome, municipios: 0 }; }
      }));
      setMesos(enriched);
    } catch (e) { setError(String(e.message)); }
    finally { setLoading(false); }
  }, [params?.state]);

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await load(); })();
    return () => { cancelled = true; };
  }, [load]);

  return (
    <div style={{padding:'24px 32px', maxWidth:1100, margin:'0 auto'}}>
      <header style={{marginBottom:20}}>
        <h1 style={{fontSize:28, marginBottom:4, display:'flex', alignItems:'center', gap:10}}>
          <Building2 size={28} style={{color:'var(--accent-blue-bright)'}}/>
          Análise Territorial por Região
        </h1>
        <p style={{color:'var(--text-gray)', margin:0, fontSize:14}}>
          Macrorregiões oficiais do IBGE para <strong>{params?.state || '...'}</strong>.
          Dados consultados em tempo real na API IBGE Localidades v1.
        </p>
      </header>

      {!params?.state && <div className="glass" style={{padding:20}}>Defina a UF no ajuste de campanha.</div>}
      {loading && <div className="glass" style={{padding:20}}>Carregando regiões IBGE...</div>}
      {error && <div className="glass" style={{padding:20, borderLeft:'4px solid #EF4444'}}>Falha: {error}</div>}

      {mesos && mesos.length > 0 && (
        <>
          <div style={{marginBottom:8, fontSize:13, color:'var(--text-gray)'}}>
            <strong>{mesos.length} mesorregiões</strong> · {mesos.reduce((s,m) => s + m.municipios, 0)} municípios totais
          </div>
          <div className="glass" style={{padding:0, overflow:'hidden'}}>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead><tr style={{background:'rgba(99,102,241,0.05)'}}>
                <th style={th}>Mesorregião IBGE</th>
                <th style={th}>Municípios</th>
                <th style={th}>Código IBGE</th>
              </tr></thead>
              <tbody>
                {mesos.map((m, i) => (
                  <tr key={m.id} style={{borderTop:'1px solid var(--border-color)'}}>
                    <td style={td}><strong style={{color:'var(--text-white)'}}>{i+1}. {m.nome}</strong></td>
                    <td style={td}>{m.municipios}</td>
                    <td style={{...td, fontFamily:'monospace', color:'var(--text-muted)'}}>{m.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{fontSize:11, color:'var(--text-muted)', marginTop:12}}>
            Fonte: IBGE Localidades v1 (https://servicodados.ibge.gov.br/api/docs/localidades).
            Próxima onda: cruzar com TSE para mostrar eleitorado e performance histórica por mesorregião.
          </p>
        </>
      )}
    </div>
  );
}

const th = {padding:'12px 16px', textAlign:'left', fontSize:12, fontWeight:600, color:'var(--text-gray)', textTransform:'uppercase'};
const td = {padding:'12px 16px', fontSize:14, color:'var(--text-white)'};
