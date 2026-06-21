import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles, Search, Globe, TrendingUp, ShieldAlert, Megaphone,
  Target, FileText, Loader2, Download, RefreshCw, ExternalLink, Brain
} from 'lucide-react';
import Markdown from '../components/Markdown';
import useScrollReveal from '../hooks/useScrollReveal';
import { downloadConsultoriaPdf } from '../lib/pdf/consultoriaPdf';
import { authedFetch } from '../services/api';
import { RO_MUNICIPALITIES } from '../data/roMunicipalities';

function readParams() {
  try {
    return JSON.parse(localStorage.getItem('campaignParams') || 'null');
  } catch {
    return null;
  }
}

const PHASES = [
  { icon: Search, label: 'Rastreando menções ao candidato na web…' },
  { icon: Globe, label: 'Coletando indicadores oficiais de Rondônia…' },
  { icon: TrendingUp, label: 'Cruzando dados eleitorais e socioeconômicos…' },
  { icon: Brain, label: 'Rodando análise preditiva e cenários…' },
  { icon: Megaphone, label: 'Desenhando narrativas e plano de ação…' }
];

const PILLARS = [
  { icon: Search, title: 'Raio-X digital', desc: 'Menções reais ao candidato em notícias, redes e sites.' },
  { icon: Globe, title: 'Diagnóstico do território', desc: 'IDH, PIB, eleitorado e dores prioritárias do município.' },
  { icon: ShieldAlert, title: 'SWOT fundamentada', desc: 'Forças e riscos com base em dados, não achismo.' },
  { icon: TrendingUp, title: 'Análise preditiva', desc: 'Cenários e segmentos decisivos para o resultado.' },
  { icon: Megaphone, title: 'Narrativas', desc: 'Mensagens por público conectadas a dores reais.' },
  { icon: Target, title: 'Plano de 90 dias', desc: 'Ações priorizadas com indicadores de sucesso.' }
];

export default function Consultoria() {
  const params = readParams();
  // Buscador: município + candidato editáveis (default vêm da campanha, se houver).
  const [form, setForm] = useState({
    candidateName: params?.candidateName || '',
    party: params?.party || '',
    role: params?.role || '',
    city: params?.city || '',
    state: params?.state || ''
  });
  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const [focusAreas, setFocusAreas] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(0);
  const [result, setResult] = useState(null);
  const [projecao, setProjecao] = useState(null);
  const [projLoading, setProjLoading] = useState(false);
  const [error, setError] = useState(null);
  const reportRef = useRef(null);

  useScrollReveal([result]);

  // NEMESIS3: mapa cargo → código TSE + flags
  const CARGO_CODE = { 'Prefeito':'PM','Vereador':'VR','Deputado Estadual':'DE','Deputado Federal':'DF','Senador':'SF','Governador':'GV' };
  const cargoCode = CARGO_CODE[form.role] || 'PM';
  const cargoEstadual = ['DE','DF','SF','GV'].includes(cargoCode);
  const cargoProporcional = ['VR','DE','DF'].includes(cargoCode);

  const carregarProjecao = useCallback(async () => {
    if (!form.role) return;
    setProjLoading(true);
    try {
      const res = await authedFetch('/api/electoral-projection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cargo: cargoCode,
          estado: form.state || 'RO',
          mun_code: form.city || null,
        }),
      });
      const json = await res.json();
      if (json.ok) setProjecao(json);
    } catch { /* silent */ }
    finally { setProjLoading(false); }
  }, [form.role, form.state, form.city, cargoCode]);

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await carregarProjecao(); })();
    return () => { cancelled = true; };
  }, [carregarProjecao]);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setPhase((p) => (p + 1) % PHASES.length), 4200);
    return () => clearInterval(t);
  }, [loading]);

  async function generate() {
    if (!form.candidateName.trim()) { setError('Informe o nome do candidato a pesquisar.'); return; }
    if (!cargoEstadual && !form.city) { setError('Selecione o município.'); return; }
    if (cargoEstadual && !(form.state || 'RO')) { setError('Selecione a UF.'); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    setPhase(0);
    try {
      const res = await authedFetch('/api/intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: form.candidateName.trim(),
          party: form.party,
          role: form.role,
          city: form.city,
          state: form.state || '',
          previousRole: params?.previousRole || '',
          previousYear: params?.previousYear || '',
          currentRole: params?.currentRole || '',
          coligacao: params?.coligacao || '',
          context: context.trim(),
          focusAreas,
          electoralData: projecao || null,
        })
      });
      const json = await res.json();
      if (!json.success) {
        setError(
          json.code === 'AI_NOT_CONFIGURED'
            ? 'O núcleo de inteligência ainda não foi ativado. Configure a chave da IA (ANTHROPIC_API_KEY) na Vercel para liberar a pesquisa web e a consultoria completa.'
            : json.message || 'Não foi possível gerar a consultoria.'
        );
      } else {
        setResult(json);
      }
    } catch {
      setError('Falha de conexão ao gerar a consultoria. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const [pdfLoading, setPdfLoading] = useState(false);
  async function downloadPdf() {
    if (!result?.report) return;
    setPdfLoading(true);
    try {
      await downloadConsultoriaPdf({
        candidateName: form.candidateName,
        party: form.party,
        role: form.role,
        city: form.city,
        state: form.state || 'RO',
        report: result.report,
        sources: result.sources || [],
        generatedAt: result.generatedAt
      });
    } catch (e) {
      console.error('Falha ao gerar PDF:', e);
      setError('Não foi possível gerar o PDF agora. Tente novamente.');
    } finally {
      setPdfLoading(false);
    }
  }

  const Phase = PHASES[phase].icon;

  return (
    <div className="consultoria-scope">
      {/* Hero / briefing */}
      {!result && (
        <section className="cs-hero reveal is-visible">
          <span className="cs-badge"><Sparkles size={14} /> Inteligência de campanha</span>
          <h1>Consultoria estratégica<br /><span className="cs-grad">por município e candidato</span></h1>
          <p className="cs-lead">
            Escolha o município, informe o nome do candidato e a E-Poliana rastreia menções
            reais e verificáveis (notícias e redes sociais) na web e entrega a consultoria —
            funcione o candidato já tendo disputado eleição ou estreando agora.
          </p>

          <div className="cs-pillars">
            {PILLARS.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div className={`cs-pillar reveal reveal-delay-${(idx % 4) + 1}`} key={idx}>
                  <div className="cs-pillar-icon"><Icon size={20} /></div>
                  <strong>{p.title}</strong>
                  <span>{p.desc}</span>
                </div>
              );
            })}
          </div>

          <div className="cs-form reveal">
            {!cargoEstadual ? (
              <>
                <label htmlFor="cs-city">Município (Rondônia)</label>
                <select id="cs-city" className="cs-input" value={form.city} onChange={setField('city')}>
                  <option value="" disabled>Selecione o município…</option>
                  {RO_MUNICIPALITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label htmlFor="cs-uf">Estado (UF)</label>
                <select id="cs-uf" className="cs-input" value={form.state || 'RO'} onChange={setField('state')}>
                  {['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
                <div style={{padding:'6px 4px', color:'#64748b', fontSize:12}}>
                  Cargo {cargoProporcional ? 'proporcional' : 'majoritário'} estadual — análise cobre o estado inteiro.
                </div>
              </>
            )}

            <label htmlFor="cs-name">Nome do candidato(a)</label>
            <input
              id="cs-name"
              className="cs-input"
              type="text"
              placeholder="Ex.: Maria Souza"
              value={form.candidateName}
              onChange={setField('candidateName')}
            />

            <div className="cs-form-row">
              <div>
                <label htmlFor="cs-role">Cargo pretendido</label>
                <select id="cs-role" className="cs-input" value={form.role} onChange={setField('role')}>
                  <option value="Prefeito">Prefeito(a)</option>
                  <option value="Vereador">Vereador(a)</option>
                </select>
              </div>
              <div>
                <label htmlFor="cs-party">Partido (opcional)</label>
                <input
                  id="cs-party"
                  className="cs-input"
                  type="text"
                  placeholder="Ex.: PSD, PL, MDB…"
                  value={form.party}
                  onChange={setField('party')}
                />
              </div>
            </div>

            <label htmlFor="ctx">Trajetória / contexto político (opcional, melhora muito a análise)</label>
            <textarea
              id="ctx"
              placeholder="Ex.: ex-deputado estadual e federal, ex-prefeito de Ouro Preto do Oeste, secretário de Agricultura, base no agro, coligação PRD+Solidariedade…"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
            />

            <label htmlFor="focus">Temas de interesse (opcional)</label>
            <textarea
              id="focus"
              placeholder="Ex.: saúde pública, geração de emprego, segurança, agronegócio, juventude…"
              value={focusAreas}
              onChange={(e) => setFocusAreas(e.target.value)}
              rows={3}
            />
            {projLoading && <div style={{padding:12, color:'#64748b', fontSize:14}}>Calculando projeção 2026…</div>}
            {projecao && projecao.ok !== false && (
              <div style={{margin:'16px 0', padding:16, background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:8}}>
                <div style={{fontWeight:600, fontSize:14, marginBottom:8, color:'#0369a1'}}>
                  📊 Panorama Eleitoral 2026 — {form.role}/{cargoEstadual ? (form.state || 'RO') : (form.city || '...')}
                </div>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:13}}>
                  {projecao.calculations?.map((c, i) => (
                    <div key={i} style={{padding:'6px 10px', background:'#fff', borderRadius:4}}>
                      <div style={{color:'#64748b', fontSize:11, marginBottom:2}}>{c.label}</div>
                      <div style={{fontWeight:600, color:'#0c4a6e'}}>{c.value}</div>
                      <div style={{color:'#94a3b8', fontSize:10, marginTop:2}}>{c.source}</div>
                    </div>
                  ))}
                </div>
                {projecao.warnings?.length > 0 && (
                  <div style={{marginTop:10, fontSize:11, color:'#b45309'}}>
                    ⚠️ {projecao.warnings.join(' · ')}
                  </div>
                )}
                <div style={{marginTop:8, fontSize:10, color:'#64748b', fontStyle:'italic'}}>
                  {projecao.disclaimer}
                </div>
              </div>
            )}
            <button className="cs-cta" onClick={generate} disabled={loading}>
              {loading ? <Loader2 size={18} className="cs-spin" /> : <Search size={18} />}
              {loading ? 'Pesquisando menções…' : 'Buscar menções e gerar consultoria'}
            </button>
            {error && <div className="cs-error">{error}</div>}
          </div>
        </section>
      )}

      {/* Loading premium */}
      {loading && (
        <section className="cs-loading">
          <div className="cs-loading-orb"><Phase size={28} /></div>
          <p className="cs-loading-text">{PHASES[phase].label}</p>
          <span className="cs-loading-note">Pesquisando fontes reais — isso pode levar até um minuto.</span>
        </section>
      )}

      {/* Resultado */}
      {result && !loading && (
        <section className="cs-report" ref={reportRef}>
          <div className="cs-report-head reveal is-visible">
            <div>
              <span className="cs-badge"><FileText size={14} /> Relatório de consultoria</span>
              <h1>{form.candidateName}</h1>
              <p className="cs-sub">
                {form.role} · {form.city}/{form.state || 'RO'} ·{' '}
                {new Date(result.generatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="cs-report-actions">
              <button className="cs-btn-ghost" onClick={downloadPdf} disabled={pdfLoading}>
                {pdfLoading ? <Loader2 size={16} className="cs-spin" /> : <Download size={16} />} {pdfLoading ? 'Gerando PDF…' : 'Baixar PDF'}
              </button>
              <button className="cs-btn-ghost" onClick={generate}><RefreshCw size={16} /> Refazer</button>
            </div>
          </div>

          <article className="cs-paper reveal">
            <Markdown text={result.report} />
          </article>

          {result.sources?.length > 0 && (
            <div className="cs-sources reveal">
              <h3><Globe size={18} /> Fontes consultadas na web ({result.sources.length})</h3>
              <div className="cs-sources-grid">
                {result.sources.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="cs-source">
                    <ExternalLink size={14} />
                    <span>{s.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <p className="cs-disclaimer reveal">
            Análise gerada com pesquisa web em tempo real pela E-Poliana. Estimativas devem ser validadas com pesquisa
            de campo. Conteúdo em conformidade com a Lei 9.504/97.
          </p>
        </section>
      )}
    </div>
  );
}
