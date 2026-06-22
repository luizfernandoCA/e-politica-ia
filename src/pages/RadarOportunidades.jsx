/* eslint-disable react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization */
import { useState, useEffect, useCallback } from 'react';
import { Radar, TrendingUp, Target, AlertTriangle, DollarSign } from 'lucide-react';

/**
 * Radar de Oportunidades (ajuste #6) — generalizado pra todos cargos.
 * Quando cargo é PM/VR: usa cache tse_apuracao municipal (2024).
 * Quando cargo é DE/DF/SF/GV: explica que ranking de incumbentes do pleito 2022 do estado
 *   é fonte de referência (próxima onda popula automaticamente via preload TSE estadual).
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
      } catch { /* */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const isMunicipal = ['Prefeito','Vereador'].includes(params?.role);
  const ROLE_CODE = { 'Prefeito':'PM','Vereador':'VR','Deputado Estadual':'7','Deputado Federal':'6','Senador':'5','Governador':'3' };
  const ELECTION_ID_2022 = { 'Deputado Estadual':'544', 'Deputado Federal':'544', 'Senador':'544', 'Governador':'544' };
  const [incumbentes, setIncumbentes] = useState([]);

  const load = useCallback(async () => {
    if (!params?.role) { setLoading(false); return; }
    try {
      if (isMunicipal && params?.city) {
        const res = await fetch(`/api/tse-apuracao?city=${encodeURIComponent(params.city)}&role=${params.role}&year=2024`);
        const j = await res.json();
        if (j.success) setApuracao(j);
      } else if (!isMunicipal && params?.state) {
        // Cargo estadual+: buscar incumbentes 2022 do estado via Supabase
        const { supabase } = await import('../supabase');
        const cargo_code = ROLE_CODE[params.role];
        const election_id = ELECTION_ID_2022[params.role];
        if (cargo_code && election_id) {
          const { data } = await supabase
            .from('tse_candidates')
            .select('*')
            .eq('election_id', election_id)
            .eq('cargo_code', cargo_code)
            .eq('estado', params.state)
            .eq('situacao', 'ELEITO');
          setIncumbentes(data || []);
        }
      }
    } catch { /* */ }
    setLoading(false);
  }, [isMunicipal, params?.city, params?.role, params?.state]);

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await load(); })();
    return () => { cancelled = true; };
  }, [load]);

  // Classifica candidatos da apuração municipal (PM/VR apenas)
  const oportunidades = (() => {
    if (!apuracao?.candidates) return { fortalezas:[], oportunidades:[], ameacas:[], topRef:[] };
    const partido = params?.party?.toUpperCase() || '';
    const meuPartidoCandidatos = apuracao.candidates.filter(c => (c.candidate_party_acronym||'').toUpperCase() === partido);
    const totalMeuPartido = meuPartidoCandidatos.reduce((s,c) => s + (c.candidate_votes||0), 0);
    const totalGeral = apuracao.candidates.reduce((s,c) => s + (c.candidate_votes||0), 0);
    const shareMeu = totalGeral ? (totalMeuPartido / totalGeral) : 0;
    const top = [...apuracao.candidates].sort((a,b) => (b.candidate_votes||0)-(a.candidate_votes||0));
    const ameacas = top.filter(c => (c.candidate_party_acronym||'').toUpperCase() !== partido).slice(0,5);
    return {
      fortalezas: meuPartidoCandidatos.length ? [{ label: params.city, valor: `${(shareMeu*100).toFixed(1)}% da votação`, detalhe: `${totalMeuPartido.toLocaleString('pt-BR')} votos do ${partido}` }] : [],
      oportunidades: !meuPartidoCandidatos.length ? [{ label: params.city, valor: 'Mercado aberto', detalhe: `${partido} sem candidato no último pleito` }] : [],
      ameacas: ameacas.map(a => ({ label: a.candidate_urn_name || a.candidate_name, valor: `${(a.candidate_votes||0).toLocaleString('pt-BR')} votos`, detalhe: `${a.candidate_party_acronym || '?'}${a.candidate_is_elected ? ' · eleito' : ''}` })),
      topRef: top.slice(0,3).map(a => ({ label: a.candidate_urn_name || a.candidate_name, valor: a.candidate_party_acronym, detalhe: `${(a.candidate_votes||0).toLocaleString('pt-BR')} votos — referência local` })),
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
          Classificação determinística — sem alucinação. Compara você com os top adversários do seu cargo.
        </p>
      </header>

      {loading && <div style={{padding:24, textAlign:'center', color:'var(--text-gray)'}}>Carregando...</div>}

      {!loading && !isMunicipal && incumbentes.length === 0 && (
        <div className="glass" style={{padding:20, borderLeft:'4px solid var(--accent-blue-bright)'}}>
          <strong style={{color:'var(--text-white)'}}>{params?.role} · {params?.state || 'UF'}</strong>
          <p style={{color:'var(--text-gray)', fontSize:14, margin:'8px 0 0', lineHeight:1.5}}>
            Catálogo TSE de incumbentes ainda não tem dados de {params?.role}/{params?.state} para o pleito 2022.
            Use a <strong>Consultoria IA</strong> (E-Poliana faz pesquisa web em tempo real) ou o <strong>Plano Tático</strong>
            para gerar análise dos adversários via dados externos.
          </p>
        </div>
      )}

      {!loading && !isMunicipal && incumbentes.length > 0 && (
        <>
          <div className="glass" style={{padding:'14px 18px', marginBottom:14, borderLeft:'4px solid var(--accent-blue-bright)'}}>
            <strong style={{color:'var(--text-white)', fontSize:14}}>
              {incumbentes.length} incumbentes em mandato vigente — {params?.role}/{params?.state}
            </strong>
            <p style={{color:'var(--text-gray)', fontSize:13, margin:'6px 0 0'}}>
              São os <strong>adversários reais</strong> do pleito 2026: foram eleitos em 2022 e cumprem mandato. Fonte: TSE oficial (Poder360 release).
            </p>
          </div>
          <div className="glass" style={{padding:0, overflow:'hidden'}}>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
              <thead><tr style={{background:'rgba(99,102,241,0.05)'}}>
                <th style={{padding:'10px 14px', textAlign:'left', fontSize:11, color:'var(--text-gray)', textTransform:'uppercase'}}>Nome</th>
                <th style={{padding:'10px 14px', textAlign:'left', fontSize:11, color:'var(--text-gray)', textTransform:'uppercase'}}>Partido</th>
                <th style={{padding:'10px 14px', textAlign:'left', fontSize:11, color:'var(--text-gray)', textTransform:'uppercase'}}>Federação potencial</th>
              </tr></thead>
              <tbody>
                {incumbentes.map((inc) => {
                  const partido = inc.partido_sigla;
                  const fed = ['PRD','SOLIDARIEDADE','SD'].includes(partido) ? 'PRD-Solidariedade'
                            : ['PT','PCdoB','PV'].includes(partido) ? 'Brasil da Esperança'
                            : ['PSDB','CIDADANIA'].includes(partido) ? 'PSDB-Cidadania' : '—';
                  return (
                    <tr key={inc.tse_candidate_id} style={{borderTop:'1px solid var(--border-color)'}}>
                      <td style={{padding:'10px 14px', color:'var(--text-white)', fontWeight:600}}>{inc.nome_urna}</td>
                      <td style={{padding:'10px 14px'}}>
                        <span style={{padding:'2px 8px', background:'rgba(99,102,241,0.08)', color:'var(--accent-blue-bright)', borderRadius:4, fontSize:11, fontWeight:700}}>{partido}</span>
                      </td>
                      <td style={{padding:'10px 14px', color:'var(--text-gray)', fontSize:12}}>{fed}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{fontSize:11, color:'var(--text-muted)', marginTop:10, fontStyle:'italic'}}>
            Catálogo seed: 24 eleitos RO 2022 via Poder360. Próxima onda: cronjob de preload com votos exatos por município do TSE.
          </p>
        </>
      )}

      {!loading && isMunicipal && !apuracao && (
        <div className="glass" style={{padding:20, borderLeft:'4px solid var(--accent-yellow)'}}>
          <strong>Sem cache TSE para {params?.city}</strong>
          <p style={{color:'var(--text-gray)', fontSize:14, margin:'6px 0 0'}}>
            Aguardando preload do município. Use a Consultoria IA pra análise via web.
          </p>
        </div>
      )}

      {isMunicipal && apuracao && (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:14}}>
          <RadarCard icon={<TrendingUp size={18}/>} title="Fortalezas" color="var(--accent-green-bright)" bg="rgba(34,197,94,0.06)" items={oportunidades.fortalezas} emptyMsg="Seu partido não tem base forte aqui — foco em construção." />
          <RadarCard icon={<Target size={18}/>} title="Oportunidades" color="var(--accent-blue-bright)" bg="rgba(99,102,241,0.06)" items={oportunidades.oportunidades} emptyMsg="Sem oportunidades óbvias — território disputado." />
          <RadarCard icon={<AlertTriangle size={18}/>} title="Top 5 adversários (último pleito)" color="#EF4444" bg="rgba(239,68,68,0.06)" items={oportunidades.ameacas} emptyMsg="Sem adversários significativos no cache." />
          <RadarCard icon={<DollarSign size={18}/>} title="Top 3 referência (votação local)" color="#F59E0B" bg="rgba(245,158,11,0.06)" items={oportunidades.topRef} emptyMsg="Sem referência de votação local." />
        </div>
      )}

      <p style={{fontSize:11, color:'var(--text-muted)', marginTop:16, fontStyle:'italic'}}>
        Base de dados: cache TSE (apuração oficial). Atualização automática quando preload TSE 2022 estadual estiver disponível.
      </p>
    </div>
  );
}

function RadarCard({ icon, title, color, bg, items, emptyMsg }) {
  return (
    <div className="glass" style={{padding:'16px 18px', borderLeft:`4px solid ${color}`}}>
      <h3 style={{margin:'0 0 12px', fontSize:14, color, display:'flex', alignItems:'center', gap:8}}>{icon} {title}</h3>
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
