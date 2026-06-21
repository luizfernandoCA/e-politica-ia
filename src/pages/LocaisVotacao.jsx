/* eslint-disable react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization */
import { useState, useEffect, useCallback } from 'react';
import { MapPin, Search } from 'lucide-react';

/**
 * Locais de Votação Detalhados (feature do plano Start).
 * Usa /api/tse-secoes existente. Lista seções com filtros.
 */
export default function LocaisVotacao() {
  const [params, setParams] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [zona, setZona] = useState('');

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

  const load = useCallback(async () => {
    if (!params?.city) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/tse-secoes?city=${encodeURIComponent(params.city)}&year=2024`);
      const j = await res.json();
      if (j.success || j.sections) setData(j);
    } catch { /* */ }
    setLoading(false);
  }, [params?.city]);

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await load(); })();
    return () => { cancelled = true; };
  }, [load]);

  if (!params?.city) {
    return (
      <div style={{padding:'48px 32px', textAlign:'center'}}>
        <MapPin size={48} style={{color:'var(--text-muted)'}}/>
        <h2>Locais de Votação</h2>
        <p style={{color:'var(--text-gray)'}}>Defina o município no ajuste de campanha para ver as seções eleitorais.</p>
      </div>
    );
  }

  // Aceita diferentes formatos da resposta TSE (sections, secoes, data)
  const sections = data?.sections || data?.secoes || data?.data || [];
  const filtered = sections.filter(s => {
    if (busca && !(`${s.local || s.location || ''} ${s.address || s.endereco || ''}`).toUpperCase().includes(busca.toUpperCase())) return false;
    if (zona && String(s.zona || s.zone) !== zona) return false;
    return true;
  });

  // Agregados
  const totalSecoes = sections.length;
  const totalEleitores = sections.reduce((s,x) => s + (x.eleitores || x.voters || 0), 0);
  const zonas = Array.from(new Set(sections.map(s => s.zona || s.zone).filter(Boolean))).sort();

  return (
    <div style={{padding:'24px 32px', maxWidth:1100, margin:'0 auto'}}>
      <header style={{marginBottom:20}}>
        <h1 style={{fontSize:28, marginBottom:4, display:'flex', alignItems:'center', gap:10}}>
          <MapPin size={28} style={{color:'var(--accent-blue-bright)'}}/>
          Locais de Votação
        </h1>
        <p style={{color:'var(--text-gray)', margin:0, fontSize:14}}>
          Seções eleitorais do TSE em <strong>{params.city}/{params.state || 'RO'}</strong> · Eleição 2024 (referência).
        </p>
      </header>

      {/* KPIs */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:10, marginBottom:14}}>
        <Kpi label="Seções" value={totalSecoes.toLocaleString('pt-BR')}/>
        <Kpi label="Zonas" value={zonas.length}/>
        <Kpi label="Eleitores aptos" value={totalEleitores ? totalEleitores.toLocaleString('pt-BR') : '—'}/>
        <Kpi label="Locais filtrados" value={filtered.length.toLocaleString('pt-BR')}/>
      </div>

      {/* Filtros */}
      <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:12, flexWrap:'wrap'}}>
        <div style={{flex:1, minWidth:220, position:'relative'}}>
          <Search size={14} style={{position:'absolute', left:10, top:11, color:'var(--text-muted)'}}/>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar local ou endereço..."
            style={{width:'100%', padding:'8px 10px 8px 30px', border:'1px solid var(--border-color)', borderRadius:6, fontSize:13, color:'var(--text-white)', background:'#fff'}}
          />
        </div>
        <select value={zona} onChange={e => setZona(e.target.value)}
          style={{padding:'8px 10px', border:'1px solid var(--border-color)', borderRadius:6, fontSize:13, color:'var(--text-white)', background:'#fff'}}>
          <option value="">Todas as zonas</option>
          {zonas.map(z => <option key={z} value={z}>Zona {z}</option>)}
        </select>
      </div>

      {loading && <div style={{padding:24, textAlign:'center', color:'var(--text-gray)'}}>Carregando seções via TSE...</div>}

      {!loading && sections.length === 0 && (
        <div className="glass" style={{padding:20, borderLeft:'4px solid var(--accent-yellow)'}}>
          <strong>Sem dados de seções</strong>
          <p style={{color:'var(--text-gray)', fontSize:14, margin:'6px 0 0'}}>
            O cache TSE para {params.city} ainda não foi populado, ou o município não está no inventário (RO neste MVP).
            Execute o preload em <code>scripts/preload-tse-secoes.js</code> ou aguarde a próxima sincronização.
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="glass" style={{padding:0, overflow:'hidden'}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead><tr style={{background:'rgba(99,102,241,0.05)'}}>
              <th style={th}>Local</th><th style={th}>Endereço</th><th style={th}>Zona</th><th style={th}>Seção</th><th style={th}>Eleitores</th>
            </tr></thead>
            <tbody>
              {filtered.slice(0, 200).map((s, i) => (
                <tr key={i} style={{borderTop:'1px solid var(--border-color)'}}>
                  <td style={td}><strong>{s.local || s.location || '—'}</strong></td>
                  <td style={td} title={s.address || s.endereco}>{(s.address || s.endereco || '—').slice(0, 60)}</td>
                  <td style={td}>{s.zona || s.zone || '—'}</td>
                  <td style={td}>{s.secao || s.section || '—'}</td>
                  <td style={td}>{(s.eleitores || s.voters || 0).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 200 && (
            <div style={{padding:12, fontSize:12, color:'var(--text-muted)', textAlign:'center', borderTop:'1px solid var(--border-color)'}}>
              Mostrando 200 de {filtered.length}. Refine o filtro para ver mais.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="glass" style={{padding:'12px 14px'}}>
      <div style={{fontSize:11, color:'var(--text-gray)', textTransform:'uppercase', fontWeight:600}}>{label}</div>
      <div style={{fontSize:20, fontWeight:700, color:'var(--text-white)', marginTop:2}}>{value}</div>
    </div>
  );
}

const th = {padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text-gray)', textTransform:'uppercase'};
const td = {padding:'10px 14px', fontSize:13, color:'var(--text-white)'};
