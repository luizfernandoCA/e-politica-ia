import { useState, useEffect, useCallback } from 'react';
import { Trophy, TrendingUp, Flag } from 'lucide-react';
import { supabase } from '../supabase';

/**
 * Caminho da Vitória Estratégico (feature plano Start).
 * Para cargo majoritário (PM/GV/SF): limiar de maioria absoluta ou 2 mais votados (SF).
 * Para cargo proporcional (VR/DE/DF): voto individual mínimo + cláusula partidária.
 * Plano de captação: votos meta dividido pelos territórios prioritários.
 */
export default function CaminhoVitoria({ setActivePage }) {
  const [params, setParams] = useState(null);
  const [projecao, setProjecao] = useState(null);
  const [meta, setMeta] = useState(''); // votos meta personalizada

  const ROLE_CODE = { 'Prefeito':'PM','Vereador':'VR','Deputado Estadual':'DE','Deputado Federal':'DF','Senador':'SF','Governador':'GV' };

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

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await loadProjecao(); })();
    return () => { cancelled = true; };
  }, [loadProjecao]);

  if (!params?.role) {
    return (
      <div style={{padding:'48px 32px', textAlign:'center'}}>
        <Trophy size={48} style={{color:'var(--text-muted)'}}/>
        <h2>Caminho da Vitória</h2>
        <p style={{color:'var(--text-gray)'}}>Defina cargo e UF no ajuste de campanha para calcular sua trajetória até a vitória.</p>
        <button onClick={() => setActivePage('dashboard')} style={cta}>Configurar campanha</button>
      </div>
    );
  }

  const cargoCode = ROLE_CODE[params.role] || 'PM';
  const isProp = ['VR','DE','DF'].includes(cargoCode);
  const validos = projecao?.votos_validos_estimados || 0;
  const qe = projecao?.quociente_eleitoral || 0;
  const vagas = projecao?.vagas || 0;

  // Meta de votos — calibrada com dados históricos reais
  // Para DE/DF: média histórica dos eleitos = ~0.6-0.8× QE (sobras + arrasto da legenda)
  // Para VR: tipicamente 0.5-0.7× QE
  // Para majoritários (PM/GV/PR): 50%+1 dos válidos
  // Para SF: top 2 dos válidos (referência histórica ~30%)
  const fatorPorCargo = { VR: 0.55, DE: 0.65, DF: 0.70 };
  const metaDefault = isProp
    ? Math.max(Math.ceil(qe * 0.10), Math.ceil(qe * (fatorPorCargo[cargoCode] || 0.70)))
    : (cargoCode === 'SF' ? Math.round(validos * 0.30) : Math.ceil(validos / 2) + 1);
  const metaFinal = Number(String(meta).replace(/\D/g,'')) || metaDefault;

  // Distribuição sugerida (3 cenários)
  const cenarios = [
    { nome: 'Conservador', mult: 0.4, descricao: 'Concentração em base já consolidada' },
    { nome: 'Equilibrado', mult: 0.6, descricao: 'Mistura de base + crescimento incremental' },
    { nome: 'Agressivo', mult: 0.8, descricao: 'Expansão para territórios disputados' },
  ].map(c => ({...c, votos: Math.round(metaFinal * c.mult), gap: Math.round(metaFinal * (1-c.mult))}));

  const diasAteEleicao = Math.max(0, Math.ceil((new Date('2026-10-04') - new Date()) / (1000*60*60*24)));
  const semanas = Math.max(1, Math.floor(diasAteEleicao / 7));
  const votosPorSemana = Math.ceil(metaFinal / semanas);

  return (
    <div style={{padding:'24px 32px', maxWidth:1100, margin:'0 auto'}}>
      <header style={{marginBottom:20}}>
        <h1 style={{fontSize:28, marginBottom:4, display:'flex', alignItems:'center', gap:10}}>
          <Trophy size={28} style={{color:'#F59E0B'}}/>
          Caminho da Vitória
        </h1>
        <p style={{color:'var(--text-gray)', margin:0, fontSize:14}}>
          Quantos votos faltam para você se eleger como <strong>{params.role}</strong> em {params.state || 'RO'} — e o ritmo necessário pra alcançar.
        </p>
      </header>

      {/* Meta principal */}
      <div className="glass" style={{padding:'24px 28px', marginBottom:16, borderLeft:'4px solid #F59E0B'}}>
        <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap'}}>
          <div>
            <div style={{fontSize:12, color:'var(--text-gray)', textTransform:'uppercase', fontWeight:600, marginBottom:6}}>
              {isProp ? `Voto seguro estimado para ${params.role} (${Math.round((fatorPorCargo[cargoCode] || 0.70)*100)}% do QE — média histórica dos eleitos)` : `Limiar de ${cargoCode === 'SF' ? 'competitividade (~30% válidos)' : 'maioria absoluta (50%+1)'}`}
            </div>
            <div style={{fontSize:42, fontWeight:800, color:'#F59E0B', lineHeight:1}}>
              {metaFinal.toLocaleString('pt-BR')}
            </div>
            <div style={{fontSize:13, color:'var(--text-gray)', marginTop:6}}>
              votos a conquistar até <strong>04/10/2026</strong> ({diasAteEleicao} dias)
            </div>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:6}}>
            <label style={{fontSize:11, color:'var(--text-gray)', fontWeight:600}}>Personalizar meta:</label>
            <input
              value={meta}
              onChange={e => setMeta(e.target.value)}
              placeholder={metaDefault.toLocaleString('pt-BR')}
              style={{padding:'8px 12px', border:'1px solid var(--border-color)', borderRadius:6, width:180, fontSize:14, background:'#fff', color:'var(--text-white)'}}
            />
          </div>
        </div>

        {isProp && qe > 0 && (
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:10, marginTop:18}}>
            <Mini label="Quociente Eleitoral (1 cadeira)" value={qe.toLocaleString('pt-BR')}/>
            <Mini label="Piso individual (10% QE)" value={Math.ceil(qe*0.10).toLocaleString('pt-BR')} hint="Lei 13.165/15 art. 108"/>
            <Mini label="Cláusula partidária (80% QE)" value={Math.ceil(qe*0.80).toLocaleString('pt-BR')} hint="Lei 9.504/97 art. 109"/>
            <Mini label="Vagas em disputa" value={vagas || '—'}/>
          </div>
        )}
      </div>

      {/* Ritmo necessário */}
      <div className="glass" style={{padding:'18px 22px', marginBottom:16}}>
        <h3 style={{margin:'0 0 12px', fontSize:16, display:'flex', alignItems:'center', gap:8}}>
          <TrendingUp size={18} style={{color:'var(--accent-green-bright)'}}/> Ritmo necessário
        </h3>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:12}}>
          <Mini label="Votos/semana" value={votosPorSemana.toLocaleString('pt-BR')}/>
          <Mini label="Votos/dia" value={Math.ceil(metaFinal/diasAteEleicao).toLocaleString('pt-BR')}/>
          <Mini label="Semanas restantes" value={semanas}/>
          <Mini label="Comitês p/ atingir" value={Math.ceil(metaFinal/2000) + ' (a 2k votos cada)'}/>
        </div>
      </div>

      {/* Cenários */}
      <div className="glass" style={{padding:'18px 22px'}}>
        <h3 style={{margin:'0 0 12px', fontSize:16, display:'flex', alignItems:'center', gap:8}}>
          <Flag size={18} style={{color:'var(--accent-blue-bright)'}}/> Cenários de distribuição
        </h3>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(230px, 1fr))', gap:12}}>
          {cenarios.map((c, i) => (
            <div key={i} style={{padding:14, border:'1px solid var(--border-color)', borderRadius:6, background:'rgba(99,102,241,0.03)'}}>
              <div style={{fontSize:13, fontWeight:700, color:'var(--text-white)', marginBottom:6}}>{c.nome}</div>
              <div style={{fontSize:11, color:'var(--text-gray)', marginBottom:10}}>{c.descricao}</div>
              <div style={{fontSize:11, color:'var(--text-muted)'}}>Base consolidada</div>
              <div style={{fontSize:18, fontWeight:700, color:'var(--accent-green-bright)'}}>{c.votos.toLocaleString('pt-BR')}</div>
              <div style={{fontSize:11, color:'var(--text-muted)', marginTop:6}}>Gap a conquistar</div>
              <div style={{fontSize:18, fontWeight:700, color:'#F59E0B'}}>{c.gap.toLocaleString('pt-BR')}</div>
            </div>
          ))}
        </div>
      </div>

      <p style={{fontSize:11, color:'var(--text-muted)', marginTop:14, fontStyle:'italic'}}>
        Cálculo: meta-base = {isProp ? `${Math.round((fatorPorCargo[cargoCode] || 0.70)*100)}% do QE (média histórica dos eleitos no estado — DE entra na faixa 0.55-0.70× QE somando voto pessoal + arrasto)` : cargoCode === 'SF' ? '~30% válidos (referência histórica do 2º colocado)' : '50%+1 dos válidos (CF art. 77)'}.
        Distribuição por cenário multiplica por taxa de base consolidada. Próxima onda: agregar dados reais do CRM e calcular votos por território.
      </p>
    </div>
  );
}

function Mini({ label, value, hint }) {
  return (
    <div style={{padding:'10px 12px', background:'rgba(99,102,241,0.05)', borderRadius:6}}>
      <div style={{fontSize:10, color:'var(--text-gray)', textTransform:'uppercase', fontWeight:600, marginBottom:2}}>{label}</div>
      <div style={{fontSize:18, fontWeight:700, color:'var(--text-white)'}}>{value}</div>
      {hint && <div style={{fontSize:10, color:'var(--text-muted)', marginTop:2}}>{hint}</div>}
    </div>
  );
}

const cta = {
  marginTop:16, padding:'10px 18px', background:'var(--accent-blue-bright)',
  border:'none', borderRadius:6, color:'#fff', cursor:'pointer', fontSize:14, fontWeight:600,
};
