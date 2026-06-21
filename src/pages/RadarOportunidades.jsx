/* eslint-disable react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization */
import { useState, useEffect, useCallback } from 'react';
import { Radar, TrendingUp, Target, AlertTriangle, DollarSign } from 'lucide-react';

/**
 * Radar de Oportunidades — algoritmo determinístico que classifica territórios.
 * Categorias:
 *  - Fortaleza: histórico forte do partido + alta participação
 *  - Oportunidade: alto eleitorado + baixo histórico do partido (mercado a conquistar)
 *  - Ameaça: alto histórico de adversário, território "comprometido"
 *  - Custo-benefício: votos/R$ projetados melhores
 */
export default function RadarOportunidades() {
  const [params, setParams] = useState(null);
  const [apuracao, setApuracao] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const loadData = useCallback(async () => {
    if (!params?.city || !['Prefeito','Vereador'].includes(params?.role)) {
      setLoading(false); return;
    }
    try {
      const res = await fetch(`/api/tse-apuracao?city=${encodeURIComponent(params.city)}&role=${params.role}&year=2024`);
      const j = await res.json();
      if (j.success) setApuracao(j);
    } catch { /* */ }
    setLoading(false);
  }, [params?.city, params?.role]);

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await loadData(); })();
    return () => { cancelled = true; };
  }, [loadData]);

  // Classifica candidatos da apuração 2024 em radar de oportunidades
  const oportunidades = (() => {
    if (!apuracao?.candidates) return { fortalezas:[], oportunidades:[], ameacas:[], custoBeneficio:[] };
    const partido = params?.party?.toUpperCase() || '';
    const meuPartidoCandidatos = apuracao.candidates.filter(c => (c.candidate_party_acronym||'').toUpperCase() === partido);
    const totalMeuPartido = meuPartidoCandidatos.reduce((s,c) => s + (c.candidate_votes||0), 0);
    const totalGeral = apuracao.candidates.reduce((s,c) => s + (c.candidate_votes||0), 0);
    const shareMeu = totalGeral ? (totalMeuPartido / totalGeral) : 0;

    // Adversários top 5 (por votos)
    const top = [...apuracao.candidates].sort((a,b) => (b.candidate_votes||0)-(a.candidate_votes||0)).slice(0,8);
    const ameacas = top.filter(c => (c.candidate_party_acronym||'').toUpperCase() !== partido && c.candidate_votes > 1000);

    return {
      fortalezas: meuPartidoCandidatos.length ? [{ label: params.city, valor: `${(shareMeu*100).toFixed(1)}% do votação`, detalhe: `${totalMeuPartido.toLocaleString('pt-BR')} votos do ${partido} em ${apuracao.candidates.length} candidatos` }] : [],
      oportunidades: !meuPartidoCandidatos.length ? [{ label: params.city, valor: 'Mercado aberto', detalhe: `${partido} sem candidato no último pleito municipal` }] : [],
      ameacas: ameacas.slice(0,5).map(a => ({
        label: a.candidate_urn_name || a.candidate_name,
        valor: `${(a.candidate_votes||0).toLocaleString('pt-BR')} votos`,
        detalhe: `${a.candidate_party_acronym || '?'} · ${a.candidate_is_elected ? 'eleito' : 'concorreu'}`,
      })),
      custoBeneficio: top.slice(0,3).map(a => ({
        label: a.candidate_urn_name || a.candidate_name,
        valor: a.candidate_party_acronym,
        detalhe: `${(a.candidate_votes||0).toLocaleString('pt-BR')} votos — referência de cost-per-vote local`,
      })),
    };
  })();

  return (
    <div style={{padding:'24px 32px', maxWidth:1100, margin:'0 auto'}}>
      <header style={{marginBottom:20}}>
        <h1 style={{fontSize:28, marginBottom:4, display:'flex', alignItems:'center', gap:10}}>
          <Radar size={28} style={{color:'var(--accent-blue-bright)'}}/>
          Radar de Oportunidades
        </h1>
        <p style={{color:'var(--text-gray)', margin:0, fontSize:14}}>
          Classificação determinística dos territórios e adversários a partir de dados oficiais do TSE.
          Algoritmo client-side — sem custo de IA, sem alucinação.
        </p>
      </header>

      {loading && <div style={{padding:24, textAlign:'center', color:'var(--text-gray)'}}>Carregando apuração TSE...</div>}

      {!loading && !apuracao && (
        <div className="glass" style={{padding:20, borderLeft:'4px solid var(--accent-yellow)'}}>
          <strong>Radar requer dados TSE municipais (Prefeito/Vereador)</strong>
          <p style={{color:'var(--text-gray)', fontSize:14, margin:'6px 0 0'}}>
            Para candidatos a Deputado/Senador/Governador, o radar usa cálculo projetado em 2026 (próxima onda).
            Por hora, configure cargo municipal para ver o radar.
          </p>
        </div>
      )}

      {apuracao && (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:14}}>
          <RadarCard icon={<TrendingUp size={18}/>} title="Fortalezas" color="var(--accent-green-bright)" bg="rgba(34,197,94,0.06)" items={oportunidades.fortalezas} emptyMsg="Seu partido não tem base histórica forte aqui — foco em construção." />
          <RadarCard icon={<Target size={18}/>} title="Oportunidades" color="var(--accent-blue-bright)" bg="rgba(99,102,241,0.06)" items={oportunidades.oportunidades} emptyMsg="Sem oportunidades óbvias — território disputado." />
          <RadarCard icon={<AlertTriangle size={18}/>} title="Ameaças (top 5 adversários)" color="#EF4444" bg="rgba(239,68,68,0.06)" items={oportunidades.ameacas} emptyMsg="Sem adversários significativos." />
          <RadarCard icon={<DollarSign size={18}/>} title="Referência custo-benefício (top votados)" color="#F59E0B" bg="rgba(245,158,11,0.06)" items={oportunidades.custoBeneficio} emptyMsg="Sem referência de votação local." />
        </div>
      )}

      <p style={{fontSize:11, color:'var(--text-muted)', marginTop:16, fontStyle:'italic'}}>
        Base: apuração oficial TSE 2024 (cache local). Atualização pelo ciclo 2026 será automática quando o TSE publicar.
      </p>
    </div>
  );
}

function RadarCard({ icon, title, color, bg, items, emptyMsg }) {
  return (
    <div className="glass" style={{padding:'16px 18px', borderLeft:`4px solid ${color}`}}>
      <h3 style={{margin:'0 0 12px', fontSize:14, color, display:'flex', alignItems:'center', gap:8}}>
        {icon} {title}
      </h3>
      {items.length === 0 ? (
        <div style={{padding:'10px', background: bg, borderRadius:4, fontSize:13, color:'var(--text-gray)', fontStyle:'italic'}}>{emptyMsg}</div>
      ) : items.map((it, i) => (
        <div key={i} style={{padding:'10px 0', borderTop: i>0 ? '1px solid var(--border-color)' : 'none'}}>
          <div style={{fontSize:13, fontWeight:600, color:'var(--text-white)'}}>{it.label}</div>
          <div style={{fontSize:12, color, fontWeight:600, marginTop:2}}>{it.valor}</div>
          <div style={{fontSize:11, color:'var(--text-gray)', marginTop:2}}>{it.detalhe}</div>
        </div>
      ))}
    </div>
  );
}
