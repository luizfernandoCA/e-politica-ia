/* eslint-disable react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization */
import { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, AlertTriangle, CheckCircle2, ArrowRight, Calendar, MapPin, Users } from 'lucide-react';
import { supabase } from '../supabase';
import DataSourceBadge from '../components/DataSourceBadge';

/**
 * Diagnóstico Eleitoral Completo (feature do plano Start).
 * Sumário executivo da campanha — KPIs cruzados, sinais críticos, próximos passos.
 * Sem nova serverless function: combina endpoints existentes.
 */
export default function Diagnostico({ setActivePage }) {
  const [params, setParams] = useState(null);
  const [projecao, setProjecao] = useState(null);
  const [apuracao, setApuracao] = useState(null);

  const ROLE_CODE = { 'Prefeito':'PM','Vereador':'VR','Deputado Estadual':'DE','Deputado Federal':'DF','Senador':'SF','Governador':'GV' };

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('campaignParams') || 'null');
      setParams(p);
    } catch { /* */ }
  }, []);

  const loadProjecao = useCallback(async () => {
    if (!params?.role) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/electoral-projection', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}` },
        body: JSON.stringify({
          cargo: ROLE_CODE[params.role] || 'PM',
          estado: params.state || 'RO',
          mun_code: params.city || null,
        }),
      });
      if (res.ok) setProjecao(await res.json());
    } catch { /* */ }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [params?.role, params?.state, params?.city]);

  const loadApuracao = useCallback(async () => {
    if (!params?.city || !['Prefeito','Vereador'].includes(params?.role)) return;
    try {
      const res = await fetch(`/api/tse-apuracao?city=${encodeURIComponent(params.city)}&role=${params.role}&year=2024`);
      const j = await res.json();
      if (j.success) setApuracao(j);
    } catch { /* */ }
  }, [params?.city, params?.role]);

  useEffect(() => {
    if (!params) return;
    (async () => {
      await Promise.all([loadProjecao(), loadApuracao()]);
    })();
  }, [params, loadProjecao, loadApuracao]);

  if (!params?.candidateName) {
    return (
      <Stub title="Diagnóstico Eleitoral" msg="Complete o ajuste de campanha para gerar seu diagnóstico." setActivePage={setActivePage} />
    );
  }

  const cargoCode = ROLE_CODE[params.role] || 'PM';
  const isProporcional = ['VR','DE','DF'].includes(cargoCode);
  const isMunicipal = ['PM','VR'].includes(cargoCode);
  const diasAteEleicao = Math.max(0, Math.ceil((new Date('2026-10-04') - new Date()) / (1000*60*60*24)));

  // Score de prontidão (0-100) — heurística
  const score = (() => {
    let s = 30; // base por ter cadastrado
    if (params.party) s += 10;
    if (params.previousRole) s += 10;
    if (projecao?.ok !== false) s += 20;
    if (isMunicipal && apuracao) s += 15;
    if (diasAteEleicao > 100) s += 15;
    return Math.min(100, s);
  })();

  // Sinais críticos
  const sinais = [];
  if (diasAteEleicao < 60) sinais.push({ tipo: 'critical', msg: `Apenas ${diasAteEleicao} dias até a eleição — janela apertada.` });
  if (diasAteEleicao > 250) sinais.push({ tipo: 'info', msg: `${diasAteEleicao} dias até a eleição — fase de pré-campanha (cuidado com propaganda antecipada).` });
  if (!params.previousRole) sinais.push({ tipo: 'info', msg: 'Candidato estreante — foco em construção de presença e narrativa.' });
  if (projecao?.warnings?.length) projecao.warnings.forEach(w => sinais.push({ tipo: 'warning', msg: w }));
  if (isMunicipal && apuracao && !apuracao.candidates?.find(c => c.candidate_name?.toUpperCase().includes(params.candidateName.toUpperCase()))) {
    sinais.push({ tipo: 'info', msg: `${params.candidateName} não tem histórico no município no último pleito municipal — primeira candidatura local.` });
  }

  // Próximos passos
  const passos = [];
  passos.push({ feito: !!params.party, txt: 'Definir partido e coligação' });
  passos.push({ feito: false, txt: `Estudar Plano Tático com adversários reais (${isProporcional ? 'mapa de QE + ' : ''}geografia + pautas)` });
  passos.push({ feito: false, txt: 'Mapear lideranças no CRM (meta inicial: 50)' });
  passos.push({ feito: false, txt: 'Gerar SWOT com a Mestre AI a partir do contexto local' });
  if (isMunicipal) passos.push({ feito: !!apuracao, txt: 'Validar locais de votação e distribuição por zona' });

  return (
    <div style={{padding:'24px 32px', maxWidth:1100, margin:'0 auto'}}>
      <header style={{marginBottom:24}}>
        <h1 style={{fontSize:28, marginBottom:4, display:'flex', alignItems:'center', gap:10}}>
          <ClipboardCheck size={28} style={{color:'var(--accent-blue-bright)'}}/>
          Diagnóstico Eleitoral
        </h1>
        <p style={{color:'var(--text-gray)', margin:0, fontSize:14}}>
          Sumário executivo da sua campanha — atualizado em {new Date().toLocaleDateString('pt-BR')}.
        </p>
      </header>

      {/* Identidade + Score */}
      <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:20}}>
        <div className="glass" style={{padding:'18px 22px'}}>
          <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12}}>
            <div>
              <div style={{fontSize:12, color:'var(--text-gray)', textTransform:'uppercase', letterSpacing:'0.05em'}}>Candidatura 2026</div>
              <h2 style={{fontSize:22, margin:'4px 0', color:'var(--text-white)'}}>{params.candidateName}</h2>
              <div style={{display:'flex', gap:10, flexWrap:'wrap', fontSize:13, color:'var(--text-gray)'}}>
                <span><Users size={14} style={{verticalAlign:'middle'}}/> {params.role}</span>
                <span><MapPin size={14} style={{verticalAlign:'middle'}}/> {isMunicipal ? `${params.city}/${params.state}` : `${params.state} (estado todo)`}</span>
                {params.party && <span style={{padding:'2px 8px', background:'rgba(34,197,94,0.12)', color:'var(--accent-green-bright)', borderRadius:4, fontSize:12, fontWeight:600}}>{params.party}</span>}
              </div>
            </div>
            <DataSourceBadge kind="official"/>
          </div>
        </div>
        <div className="glass" style={{padding:'18px 22px', textAlign:'center'}}>
          <div style={{fontSize:12, color:'var(--text-gray)', textTransform:'uppercase', marginBottom:4}}>Prontidão</div>
          <div style={{fontSize:36, fontWeight:800, color: score >= 70 ? 'var(--accent-green-bright)' : score >= 40 ? '#F59E0B' : '#EF4444'}}>{score}<span style={{fontSize:18, color:'var(--text-muted)'}}>/100</span></div>
          <div style={{fontSize:11, color:'var(--text-muted)'}}>{diasAteEleicao} dias até 04/10/2026</div>
        </div>
      </div>

      {/* Snapshot eleitoral */}
      {projecao?.ok !== false && (
        <section className="glass" style={{padding:'18px 22px', marginBottom:20}}>
          <h3 style={{margin:'0 0 12px', fontSize:16}}>📊 Snapshot Eleitoral 2026</h3>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:12}}>
            {projecao?.calculations?.slice(0, 4).map((c, i) => (
              <div key={i} style={{padding:'10px 12px', background:'rgba(99,102,241,0.06)', borderRadius:6}}>
                <div style={{fontSize:10, color:'var(--text-gray)', textTransform:'uppercase', marginBottom:2}}>{c.label}</div>
                <div style={{fontSize:16, fontWeight:700, color:'var(--text-white)'}}>{c.value}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setActivePage('apuracao-tse')} style={ctaSecondary}>Ver Coeficiente completo <ArrowRight size={14}/></button>
        </section>
      )}

      {/* Sinais críticos */}
      <section className="glass" style={{padding:'18px 22px', marginBottom:20}}>
        <h3 style={{margin:'0 0 12px', fontSize:16}}>🚨 Sinais Críticos</h3>
        {sinais.length === 0 ? (
          <div style={{color:'var(--text-gray)', fontSize:14}}>Nenhum sinal crítico detectado. Continue construindo a campanha.</div>
        ) : sinais.map((s, i) => (
          <div key={i} style={{display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderTop: i>0 ? '1px solid var(--border-color)' : 'none'}}>
            <AlertTriangle size={16} style={{color: s.tipo==='critical'?'#EF4444':s.tipo==='warning'?'#F59E0B':'var(--accent-blue-bright)', flexShrink:0}}/>
            <span style={{fontSize:13, color:'var(--text-gray)'}}>{s.msg}</span>
          </div>
        ))}
      </section>

      {/* Próximos passos */}
      <section className="glass" style={{padding:'18px 22px'}}>
        <h3 style={{margin:'0 0 12px', fontSize:16}}>✅ Próximos Passos</h3>
        {passos.map((p, i) => (
          <div key={i} style={{display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderTop: i>0 ? '1px solid var(--border-color)' : 'none'}}>
            {p.feito ? <CheckCircle2 size={16} style={{color:'var(--accent-green-bright)'}}/> : <Calendar size={16} style={{color:'var(--text-muted)'}}/>}
            <span style={{fontSize:14, color: p.feito ? 'var(--text-muted)' : 'var(--text-white)', textDecoration: p.feito ? 'line-through' : 'none'}}>{p.txt}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

function Stub({ title, msg, setActivePage }) {
  return (
    <div style={{padding:'48px 32px', textAlign:'center'}}>
      <h2 style={{fontSize:24}}>{title}</h2>
      <p style={{color:'var(--text-gray)'}}>{msg}</p>
      <button onClick={() => setActivePage('dashboard')} style={ctaSecondary}>Ir para Painel <ArrowRight size={14}/></button>
    </div>
  );
}

const ctaSecondary = {
  marginTop:12, padding:'8px 14px', background:'rgba(99,102,241,0.08)',
  border:'1px solid rgba(99,102,241,0.2)', borderRadius:6,
  color:'var(--accent-blue-bright)', cursor:'pointer', fontSize:13, fontWeight:600,
  display:'inline-flex', alignItems:'center', gap:6
};
