import { useState, useRef, useEffect } from 'react';
import {
  Sparkles, Search, Globe, TrendingUp, ShieldAlert, Megaphone,
  Target, FileText, Loader2, Download, RefreshCw, ExternalLink, Brain
} from 'lucide-react';
import Markdown from '../components/Markdown';
import useScrollReveal from '../hooks/useScrollReveal';
import { downloadConsultoriaPdf } from '../lib/pdf/consultoriaPdf';

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
  const [focusAreas, setFocusAreas] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const reportRef = useRef(null);

  useScrollReveal([result]);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setPhase((p) => (p + 1) % PHASES.length), 4200);
    return () => clearInterval(t);
  }, [loading]);

  async function generate() {
    if (!params?.candidateName) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setPhase(0);
    try {
      const res = await fetch('/api/intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: params.candidateName,
          party: params.party,
          role: params.role,
          city: params.city,
          state: params.state || 'RO',
          focusAreas
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
        candidateName: params.candidateName,
        party: params.party,
        role: params.role,
        city: params.city,
        state: params.state || 'RO',
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

  if (!params?.candidateName) {
    return (
      <div className="consultoria-scope" style={{ padding: '2rem' }}>
        <div className="cs-empty reveal is-visible">
          <Sparkles size={28} />
          <h2>Consultoria Estratégica E-Poliana</h2>
          <p>Configure sua campanha primeiro (nome do candidato, cargo e município) para gerar a consultoria.</p>
        </div>
      </div>
    );
  }

  const Phase = PHASES[phase].icon;

  return (
    <div className="consultoria-scope">
      {/* Hero / briefing */}
      {!result && (
        <section className="cs-hero reveal is-visible">
          <span className="cs-badge"><Sparkles size={14} /> Inteligência de campanha</span>
          <h1>Consultoria estratégica para<br /><span className="cs-grad">{params.candidateName}</span></h1>
          <p className="cs-sub">
            {params.role} · {params.city}/{params.state || 'RO'}{params.party ? ` · ${params.party}` : ''}
          </p>
          <p className="cs-lead">
            A E-Poliana pesquisa a internet em tempo real, cruza indicadores oficiais de Rondônia e entrega
            uma consultoria de pré-campanha — não um texto genérico de IA.
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
            <label htmlFor="focus">Temas de interesse (opcional)</label>
            <textarea
              id="focus"
              placeholder="Ex.: saúde pública, geração de emprego, segurança, agronegócio, juventude…"
              value={focusAreas}
              onChange={(e) => setFocusAreas(e.target.value)}
              rows={3}
            />
            <button className="cs-cta" onClick={generate} disabled={loading}>
              {loading ? <Loader2 size={18} className="cs-spin" /> : <Sparkles size={18} />}
              {loading ? 'Gerando consultoria…' : 'Gerar consultoria estratégica'}
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
              <h1>{params.candidateName}</h1>
              <p className="cs-sub">
                {params.role} · {params.city}/{params.state || 'RO'} ·{' '}
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
