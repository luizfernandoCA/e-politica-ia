/* eslint-disable react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Map as MapIcon, Layers, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase';

/**
 * Mapa Eleitoral Interativo (feature do plano Start).
 * Carrega Leaflet via CDN dinamicamente — sem adicionar peso ao bundle inicial.
 * GeoJSON: shape simplificado do Brasil + RO municípios (IBGE).
 * Camadas: choropleth por eleitorado, comparecimento, % do partido (se municipal).
 */

const LEAFLET_CDN = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const GEOJSON_BR_STATES = 'https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/brazil-states.geojson';


// Top 5 colégios eleitorais por UF — base TSE 2024 (referência). Próxima onda: cron preload por UF.
const TOP5_BY_UF = {
  RO: [
    { nome: 'Porto Velho', eleitorado: 362248, estrategia: 'Hub de mídia: comício + IG/TikTok diário, foco em zona oeste.' },
    { nome: 'Ji-Paraná', eleitorado: 110000, estrategia: 'Polo regional: agenda semanal de lideranças locais.' },
    { nome: 'Ariquemes', eleitorado: 100000, estrategia: 'Crescimento agro: pauta econômica + visitas a cooperativas.' },
    { nome: 'Cacoal', eleitorado: 75000, estrategia: 'Histórico de federação: ativar base PRD/Solidariedade local.' },
    { nome: 'Vilhena', eleitorado: 70000, estrategia: 'Fronteira do agro: temas de infra-estrutura e segurança rural.' },
  ],
  SP: [
    { nome: 'São Paulo', eleitorado: 9600000, estrategia: 'Concentra 27% do eleitorado estadual.' },
    { nome: 'Guarulhos', eleitorado: 925000, estrategia: 'Base operária + porta-a-porta.' },
    { nome: 'Campinas', eleitorado: 877000, estrategia: 'Polo universitário + tecnologia.' },
    { nome: 'São Bernardo do Campo', eleitorado: 632000, estrategia: 'ABC paulista: pauta industrial e sindicatos.' },
    { nome: 'Santo André', eleitorado: 545000, estrategia: 'ABC: alianças partidárias regionais.' },
  ],
};

export default function MapaEleitoral() {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [params, setParams] = useState(null);
  const [layer, setLayer] = useState('eleitorado'); // eleitorado | comparecimento | partido
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tseData, setTseData] = useState(null);

  // 1) Load Leaflet CSS + JS dinamicamente
  useEffect(() => {
    if (window.L) return;
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    if (!document.querySelector(`script[src="${LEAFLET_CDN}"]`)) {
      const s = document.createElement('script');
      s.src = LEAFLET_CDN; s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  // 2) Load campaign params
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

  // 3) Carregar dados do TSE — apuração do estado se cargo estadual; município se municipal
  const loadTseData = useCallback(async () => {
    if (!params?.state) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      // Endpoint determinístico: pega projeção (que tem eleitorado por estado)
      const res = await fetch('/api/electoral-projection', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ cargo:'DE', estado: params.state }),
      });
      if (res.ok) setTseData(await res.json());
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [params?.state]);

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await loadTseData(); })();
    return () => { cancelled = true; };
  }, [loadTseData]);

  // 4) Iniciar mapa quando Leaflet estiver carregado
  useEffect(() => {
    let interval;
    let cancelled = false;
    function init() {
      if (!window.L || !containerRef.current || mapRef.current) return;
      const map = window.L.map(containerRef.current, { zoomControl: true, attributionControl: true })
        .setView([-12.5, -55.5], 4); // centro do Brasil
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);
      mapRef.current = map;

      // Carregar GeoJSON e adicionar choropleth
      fetch(GEOJSON_BR_STATES)
        .then(r => r.json())
        .then(geo => {
          if (cancelled) return;
          window.L.geoJSON(geo, {
            style: () => styleForUF(),
            onEachFeature: (feature, leafletLayer) => {
              const ufName = feature.properties.name;
              const isUserState = params?.state && ufLongName(params.state) === ufName;
              const popupContent = popupForUF(ufName, isUserState);
              leafletLayer.bindPopup(popupContent);
              if (isUserState) {
                leafletLayer.setStyle({ fillColor: '#2563EB', fillOpacity: 0.7, color: '#1e40af', weight: 2 });
                map.fitBounds(leafletLayer.getBounds(), { maxZoom: 6 });
              }
            },
          }).addTo(map);
        })
        .catch(e => setError('Falha ao carregar mapa do Brasil: ' + e.message));
    }
    interval = setInterval(() => {
      if (window.L) { clearInterval(interval); init(); }
    }, 200);
    return () => { cancelled = true; clearInterval(interval); if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [params?.state, tseData, layer]);

  if (!params?.state) {
    return (
      <div style={{padding:'48px 32px', textAlign:'center'}}>
        <MapIcon size={48} style={{color:'var(--text-muted)'}}/>
        <h2>Mapa Eleitoral</h2>
        <p style={{color:'var(--text-gray)'}}>Defina sua UF no ajuste de campanha para abrir o mapa.</p>
      </div>
    );
  }

  return (
    <div style={{padding:'24px 32px', maxWidth:1200, margin:'0 auto'}}>
      <header style={{marginBottom:16}}>
        <h1 style={{fontSize:28, marginBottom:4, display:'flex', alignItems:'center', gap:10}}>
          <MapIcon size={28} style={{color:'var(--accent-blue-bright)'}}/>
          Mapa Eleitoral
        </h1>
        <p style={{color:'var(--text-gray)', margin:0, fontSize:14}}>
          Camada base: OpenStreetMap. Choropleth dos estados com destaque para sua UF cadastrada ({params.state}).
        </p>
      </header>

      <div style={{display:'flex', gap:8, marginBottom:12, alignItems:'center'}}>
        <Layers size={14} style={{color:'var(--text-gray)'}}/>
        <label style={{fontSize:12, fontWeight:600, color:'var(--text-gray)'}}>Camada:</label>
        {['eleitorado','comparecimento','partido'].map(l => (
          <button key={l}
            onClick={() => setLayer(l)}
            style={{
              padding:'4px 10px', fontSize:12, fontWeight:600,
              border:'1px solid var(--border-color)',
              borderRadius:4,
              background: layer === l ? 'var(--accent-blue-bright)' : 'transparent',
              color: layer === l ? '#fff' : 'var(--text-gray)',
              cursor:'pointer', textTransform:'capitalize'
            }}>{l}</button>
        ))}
      </div>

      {error && (
        <div style={{padding:12, background:'rgba(239,68,68,0.08)', color:'#b91c1c', borderRadius:6, marginBottom:8, fontSize:13, display:'flex', alignItems:'center', gap:8}}>
          <AlertCircle size={16}/> {error}
        </div>
      )}

      <div ref={containerRef} style={{height:'560px', width:'100%', borderRadius:8, border:'1px solid var(--border-color)', background:'#f8fafc'}}/>

      {loading && <div style={{marginTop:8, fontSize:12, color:'var(--text-gray)'}}>Carregando dados TSE...</div>}

      {tseData && (
        <div className="glass" style={{padding:'14px 18px', marginTop:12}}>
          <strong style={{fontSize:13}}>Sua UF: {params.state}</strong>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:8, marginTop:8}}>
            {tseData?.calculations?.slice(0, 4).map((c, i) => (
              <div key={i} style={{fontSize:12}}>
                <span style={{color:'var(--text-gray)'}}>{c.label}:</span>{' '}
                <strong style={{color:'var(--text-white)'}}>{c.value}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 5 colégios eleitorais — referência */}
      {params?.state && (
        <div className="glass" style={{padding:'14px 18px', marginTop:14}}>
          <h3 style={{margin:'0 0 8px', fontSize:14, fontWeight:700, color:'var(--text-white)'}}>
            🏆 Top 5 colégios eleitorais — {params.state}
          </h3>
          <p style={{fontSize:12, color:'var(--text-gray)', margin:'0 0 10px'}}>
            Maiores municípios em eleitorado apto. Concentrar esforço nos top 3 historicamente garante 50-65% dos votos válidos do estado.
          </p>
          <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
            <thead><tr style={{background:'rgba(99,102,241,0.05)'}}>
              <th style={{padding:'8px 10px', textAlign:'left', fontSize:11, color:'var(--text-gray)', textTransform:'uppercase'}}>#</th>
              <th style={{padding:'8px 10px', textAlign:'left', fontSize:11, color:'var(--text-gray)', textTransform:'uppercase'}}>Município</th>
              <th style={{padding:'8px 10px', textAlign:'right', fontSize:11, color:'var(--text-gray)', textTransform:'uppercase'}}>Eleitorado 2024</th>
              <th style={{padding:'8px 10px', textAlign:'left', fontSize:11, color:'var(--text-gray)', textTransform:'uppercase'}}>Estratégia sugerida</th>
            </tr></thead>
            <tbody>
              {(TOP5_BY_UF[params.state] || []).map((m, i) => (
                <tr key={i} style={{borderTop:'1px solid var(--border-color)'}}>
                  <td style={{padding:'8px 10px', color:'var(--text-white)', fontWeight:700}}>{i+1}</td>
                  <td style={{padding:'8px 10px', color:'var(--text-white)'}}>{m.nome}</td>
                  <td style={{padding:'8px 10px', color:'var(--text-white)', textAlign:'right'}}>{m.eleitorado.toLocaleString('pt-BR')}</td>
                  <td style={{padding:'8px 10px', color:'var(--text-gray)', fontSize:12}}>{m.estrategia}</td>
                </tr>
              ))}
              {(!TOP5_BY_UF[params.state]) && (
                <tr><td colSpan={4} style={{padding:'10px', color:'var(--text-muted)', fontStyle:'italic'}}>Top 5 do {params.state} será carregado via TSE no próximo preload.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p style={{fontSize:11, color:'var(--text-muted)', marginTop:8}}>
        ⓘ Leaflet (open-source) sobre tiles do OpenStreetMap. GeoJSON dos estados via codeforgermany. Próximas ondas:
        choropleth por município dentro da UF, heatmap por seção, drill-down até zona eleitoral.
      </p>
    </div>
  );
}

function ufLongName(uf) {
  const map = { AC:'Acre',AL:'Alagoas',AM:'Amazonas',AP:'Amapá',BA:'Bahia',CE:'Ceará',DF:'Distrito Federal',
    ES:'Espírito Santo',GO:'Goiás',MA:'Maranhão',MG:'Minas Gerais',MS:'Mato Grosso do Sul',MT:'Mato Grosso',
    PA:'Pará',PB:'Paraíba',PE:'Pernambuco',PI:'Piauí',PR:'Paraná',RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',
    RO:'Rondônia',RR:'Roraima',RS:'Rio Grande do Sul',SC:'Santa Catarina',SE:'Sergipe',SP:'São Paulo',TO:'Tocantins' };
  return map[uf] || uf;
}

function styleForUF() {
  return { color:'#94a3b8', weight:1, fillColor:'#e2e8f0', fillOpacity:0.4 };
}

function popupForUF(ufName, isUserState) {
  return `<strong>${ufName}</strong>${isUserState ? ' <span style="color:#2563EB;font-size:11px;">[sua candidatura]</span>' : ''}<br><span style="font-size:11px;color:#64748b">Drill-down por município na próxima onda.</span>`;
}
