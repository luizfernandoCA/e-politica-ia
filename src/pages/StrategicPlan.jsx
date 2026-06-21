import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import DataSourceBadge from '../components/DataSourceBadge';

/**
 * Plano Tático — UI esqueleto da Onda 1.
 * Cobre o fluxo end-to-end: escolher candidato → gerar → visualizar.
 * As 12 telas pixel-perfect do EleitoAI são deriváveis desta base nas próximas ondas.
 */
export default function StrategicPlan({ user }) {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [latestPlan, setLatestPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('candidate_profiles')
        .select('*')
        .order('updated_at', { ascending: false });
      if (cancelled) return;
      setProfiles(data || []);
      if (data?.[0]) setSelectedProfile(data[0]);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedProfile?.id) {
        if (!cancelled) setLatestPlan(null);
        return;
      }
      const { data } = await supabase
        .from('strategic_plans')
        .select('*')
        .eq('candidate_profile_id', selectedProfile.id)
        .eq('status', 'READY')
        .order('created_at', { ascending: false })
        .limit(1);
      if (!cancelled) setLatestPlan(data?.[0] || null);
    })();
    return () => { cancelled = true; };
  }, [selectedProfile?.id]);

  async function generatePlan() {
    if (!selectedProfile) return;
    setLoading(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setError('Sessão expirada. Recarregue.'); return; }
      const res = await fetch('/api/strategic-plan/generate', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}` },
        body: JSON.stringify({
          candidate_profile_id: selectedProfile.id,
          nome_urna: selectedProfile.nome_urna,
          cargo_alvo: selectedProfile.cargo_alvo,
          estado: selectedProfile.estado,
          mun_code: selectedProfile.mun_code,
          ano_eleicao: selectedProfile.ano_eleicao,
          tse_candidate_id: selectedProfile.tse_candidate_id,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.code ? `${json.code}: ${json.detail || ''}` : 'Falha ao gerar plano');
      } else {
        setLatestPlan({
          id: json.plan_id, plan_data: json.plan_data,
          degraded_sources: json.degraded_sources,
          cost_usd_cents: json.cost_usd_cents,
          ready_at: new Date().toISOString(),
        });
      }
    } catch (e) { setError(String(e.message || e)); }
    finally { setLoading(false); }
  }

  if (!user) return <div style={{padding:24}}>Faça login para acessar o Plano Tático.</div>;

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin:'0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, marginBottom: 4 }}>Plano Tático</h1>
        <p style={{ color:'#64748b', margin:0 }}>
          Cruzamento de dados oficiais TSE + IBGE com análise estratégica IA (Claude Opus 4.7).
          Os dados são reais e cada item do plano cita a fonte.
        </p>
      </header>

      {profiles.length === 0 ? (
        <div style={{ background:'#fef3c7', padding:16, borderRadius:8, marginBottom:16 }}>
          Você ainda não cadastrou uma candidatura. Vá em <strong>Configurar Campanha</strong> primeiro.
        </div>
      ) : (
        <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:16 }}>
          <label style={{ fontWeight: 600 }}>Candidatura:</label>
          <select
            value={selectedProfile?.id || ''}
            onChange={e => setSelectedProfile(profiles.find(p => p.id === e.target.value))}
            style={{ padding:'8px 12px', border:'1px solid #cbd5e1', borderRadius:6 }}
          >
            {profiles.map(p => (
              <option key={p.id} value={p.id}>
                {p.nome_urna} — {p.cargo_alvo}/{p.estado}{p.mun_code ? `/${p.mun_code}` : ''} ({p.ano_eleicao})
              </option>
            ))}
          </select>
          <button
            onClick={generatePlan}
            disabled={loading || !selectedProfile}
            style={{ padding:'10px 18px', background:'#0ea5e9', color:'#fff', border:0, borderRadius:6, cursor:'pointer', fontWeight:600, opacity: loading?0.6:1 }}
          >
            {loading ? 'Gerando...' : (latestPlan ? 'Gerar nova versão' : 'Gerar Plano Tático')}
          </button>
        </div>
      )}

      {error && (
        <div style={{ background:'#fef2f2', color:'#991b1b', padding:12, borderRadius:6, marginBottom:16 }}>
          {error}
        </div>
      )}

      {latestPlan?.plan_data ? (
        <PlanViewer plan={latestPlan} />
      ) : (
        <div style={{ color:'#64748b', padding:32, textAlign:'center', border:'1px dashed #cbd5e1', borderRadius:8 }}>
          Nenhum plano gerado ainda. Clique acima para criar o primeiro.
        </div>
      )}
    </div>
  );
}

function PlanViewer({ plan }) {
  const d = plan.plan_data;
  return (
    <div>
      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:16, color:'#475569', fontSize:13 }}>
        <DataSourceBadge kind="official" />
        <span>Gerado em {new Date(plan.ready_at).toLocaleString('pt-BR')}</span>
        <span>· Custo: US$ {((plan.cost_usd_cents||0)/100).toFixed(3)}</span>
        {plan.degraded_sources?.length ? <span style={{color:'#b45309'}}>· ⚠️ Sem: {plan.degraded_sources.join(', ')}</span> : null}
      </div>

      <Section title="🎯 Mapa de Adversários">
        {d.adversaries?.length ? (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ background:'#f1f5f9' }}>
              <th style={th}>#</th><th style={th}>Adversário</th><th style={th}>Partido</th>
              <th style={th}>Ameaça</th><th style={th}>Por quê</th>
            </tr></thead>
            <tbody>
              {d.adversaries.map(a => (
                <tr key={a.tse_candidate_id || a.rank} style={{ borderTop:'1px solid #e2e8f0' }}>
                  <td style={td}>{a.rank}</td>
                  <td style={td}><strong>{a.nome_urna}</strong></td>
                  <td style={td}>{a.partido_sigla}</td>
                  <td style={td}>{((a.threat_score||0)*100).toFixed(0)}%</td>
                  <td style={td}>{a.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <em>Nenhum adversário identificado.</em>}
      </Section>

      <Section title="📍 Geografia de Esforço">
        {d.territories?.length ? d.territories.map((t,i) => (
          <div key={i} style={card}>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <strong>{t.mun_name || t.mun_code} {t.zone_code ? `· Zona ${t.zone_code}` : ''}</strong>
              <span style={{ color: t.priority==='ALTA'?'#dc2626':t.priority==='MEDIA'?'#d97706':'#16a34a' }}>{t.priority}</span>
            </div>
            <div style={{ color:'#475569', marginTop:4 }}>{t.rationale}</div>
          </div>
        )) : <em>Nenhum território priorizado.</em>}
      </Section>

      <Section title="📅 Calendário de Mensagem (4 semanas)">
        {d.content_calendar?.length ? d.content_calendar.map((wk,i) => (
          <div key={i} style={{...card, background:'#fafafa'}}>
            <div style={{fontWeight:600, marginBottom:8}}>Semana de {wk.week_start} — {wk.theme}</div>
            {wk.messages?.map((m,j) => (
              <div key={j} style={{ padding:'8px 0', borderTop: j>0?'1px solid #e2e8f0':'none' }}>
                <div style={{ fontSize:12, color:'#64748b' }}>[{m.channel}]</div>
                <div>{m.message}</div>
                <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}><em>{m.why}</em></div>
              </div>
            ))}
          </div>
        )) : <em>Calendário vazio.</em>}
      </Section>

      {d.warnings?.length ? (
        <Section title="⚠️ Avisos">
          <ul style={{ margin:0, paddingLeft:20 }}>
            {d.warnings.map((w,i) => <li key={i}>{w}</li>)}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

const th = { padding:'10px 12px', textAlign:'left', fontSize:13, fontWeight:600, color:'#475569' };
const td = { padding:'10px 12px', fontSize:14 };
const card = { padding:12, border:'1px solid #e2e8f0', borderRadius:6, marginBottom:8 };

function Section({ title, children }) {
  return (
    <section style={{ marginBottom:24 }}>
      <h2 style={{ fontSize:18, marginBottom:12 }}>{title}</h2>
      {children}
    </section>
  );
}
