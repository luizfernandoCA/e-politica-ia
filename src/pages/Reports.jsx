import { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Trophy,
  DollarSign,
  MapPin,
  Brain,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import DataSourceBadge from '../components/DataSourceBadge';

/**
 * Relatórios — cruzamento de dados oficiais TSE + dados internos.
 *
 * Dados consumidos (todos via /api/*):
 *   - /api/tse-apuracao    → posição do candidato + agregados eleição
 *   - /api/tse-gastos      → prestação de contas
 *   - /api/tse-secoes      → boletim por zona/seção
 *
 * Saídas:
 *   - Relatório executivo on-screen
 *   - Export CSV consolidado
 *   - Geração de análise textual via Mestre (Claude API)
 */

function readCampaignParams() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem('campaignParams') || 'null');
  } catch {
    return null;
  }
}

function fmtNum(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('pt-BR');
}

function fmtBRL(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  });
}

function fmtPct(n, d = 2) {
  if (n == null) return '—';
  return `${Number(n).toFixed(d).replace('.', ',')}%`;
}

export default function Reports() {
  const params = readCampaignParams();
  const city = params?.city || '';
  const role = params?.role || 'Vereador';
  const candidateHint = params?.candidateName || '';

  const [apuracao, setApuracao] = useState(null);
  const [gastos, setGastos] = useState(null);
  const [secoes, setSecoes] = useState(null);
  const [mestreInsight, setMestreInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingInsight, setGeneratingInsight] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!city) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function loadAll() {
      try {
        const apurRes = await fetch(
          `/api/tse-apuracao?city=${encodeURIComponent(city)}&role=${role}&year=2024`
        );
        const apurJson = await apurRes.json();
        if (cancelled) return;
        if (!apurJson.success) throw new Error(apurJson.error || 'Erro apuração');
        setApuracao(apurJson);

        const target = candidateHint.toUpperCase();
        const myCand = apurJson.candidates?.find((c) =>
          c.candidate_urn_name?.toUpperCase().includes(target)
        );

        if (myCand?.candidate_sq) {
          const gastosRes = await fetch(
            `/api/tse-gastos?candidate_sq=${myCand.candidate_sq}&election_id=619`
          );
          const gastosJson = await gastosRes.json();
          if (!cancelled && gastosJson.success && gastosJson.candidates?.[0]) {
            setGastos(gastosJson.candidates[0]);
          }

          const secRes = await fetch(
            `/api/tse-secoes?candidate_sq=${myCand.candidate_sq}&aggregate=zona&election_id=619`
          );
          const secJson = await secRes.json();
          if (!cancelled && secJson.success && secJson.zones?.length) {
            setSecoes(secJson);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAll();
    return () => {
      cancelled = true;
    };
  }, [city, role, candidateHint]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const myCandidate = useMemo(() => {
    if (!apuracao?.candidates || !candidateHint) return null;
    const target = candidateHint.toUpperCase();
    return (
      apuracao.candidates.find((c) =>
        c.candidate_urn_name?.toUpperCase().includes(target)
      ) || apuracao.candidates[0]
    );
  }, [apuracao, candidateHint]);

  function exportCSV() {
    if (!myCandidate) return;
    const lines = [
      ['Campo', 'Valor'],
      ['Candidato', myCandidate.candidate_urn_name],
      ['Partido', myCandidate.party_abbr],
      ['Número', myCandidate.candidate_number],
      ['Cargo', role],
      ['Município', apuracao.municipality?.name],
      ['Eleição', '2024 · 1º Turno'],
      ['Colocação', myCandidate.candidate_seq],
      ['Votos', myCandidate.candidate_votes],
      ['% dos válidos', myCandidate.candidate_percentage],
      ['Resultado', myCandidate.candidate_outcome],
      ['Eleitorado total', apuracao.aggregate?.totalVoters],
      ['Comparecimento', apuracao.aggregate?.totalPresent],
      ['% Comparecimento', apuracao.aggregate?.pctPresent],
      ['', ''],
      ['== PRESTAÇÃO DE CONTAS ==', ''],
      ['Total Receita', gastos?.total_receita ?? '—'],
      ['Total Despesa', gastos?.total_despesa ?? '—'],
      ['Doações próprias', gastos?.total_doacoes_proprio ?? '—'],
      ['Limite legal', gastos?.limite_legal ?? '—'],
      ['Custo por voto', gastos?.custo_por_voto ?? '—'],
      ['Taxa uso limite (%)', gastos?.taxa_uso_limite ?? '—'],
      ['', ''],
      ['== DISTRIBUIÇÃO POR ZONA ==', '']
    ];
    if (secoes?.zones) {
      for (const z of secoes.zones) {
        lines.push([
          `Zona ${z.electoral_zone}`,
          `${z.votes} votos em ${z.sections} seções`
        ]);
      }
    }
    const csv = lines
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${(myCandidate.candidate_urn_name || 'candidato')
      .toLowerCase()
      .replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function generateMestreInsight() {
    if (!myCandidate) return;
    setGeneratingInsight(true);
    setMestreInsight(null);
    try {
      const prompt =
        `Gere um diagnóstico estratégico EXECUTIVO (máx 350 palavras) para a campanha. ` +
        `Use as tools disponíveis: chame get_candidate, get_gastos e get_votos_por_zona para ` +
        `o candidato "${myCandidate.candidate_urn_name}" em ${apuracao.municipality?.name}/${role}. ` +
        `Estrutura: ### Diagnóstico, ### Pontos fortes, ### Riscos, ### Próximas ações (3 itens priorizados).`;

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ sender: 'user', text: prompt }],
          context: {
            candidateName: myCandidate.candidate_urn_name,
            candidateParty: myCandidate.party_abbr,
            city: apuracao.municipality?.name,
            role
          }
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'IA indisponível');
      setMestreInsight({ text: json.text, tools_used: json.tools_used });
    } catch (e) {
      setMestreInsight({ error: e.message });
    } finally {
      setGeneratingInsight(false);
    }
  }

  if (!city) {
    return (
      <div style={{ padding: '2rem' }}>
        <div className="glass" style={{ padding: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem' }}>Relatórios</h2>
          <p style={{ color: 'var(--text-gray)', marginTop: '0.5rem' }}>
            Configure sua campanha primeiro (município, cargo e nome do candidato) para
            gerar relatórios cruzados.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-gray)' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '1rem' }}>Compilando relatório cruzado…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <div className="glass" style={{ padding: '2rem', borderLeft: '4px solid #EF4444' }}>
          <AlertCircle size={24} color="#EF4444" />
          <h3 style={{ marginTop: '0.5rem' }}>Erro ao carregar dados</h3>
          <p style={{ color: 'var(--text-gray)' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div
        className="glass"
        style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-green-bright)' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-title)',
                fontSize: '1.5rem',
                fontWeight: 800,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                flexWrap: 'wrap'
              }}
            >
              📊 Relatório Executivo
              <DataSourceBadge kind="official" size="lg" />
            </h1>
            <p style={{ color: 'var(--text-gray)', fontSize: '0.85rem', margin: '4px 0 0' }}>
              {myCandidate?.candidate_urn_name || candidateHint} ·{' '}
              {apuracao?.municipality?.name} · {role} · Eleição 2024 (1º T)
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={exportCSV} style={primaryBtnStyle}>
              <Download size={16} /> CSV
            </button>
            <button
              onClick={generateMestreInsight}
              disabled={generatingInsight}
              style={{ ...primaryBtnStyle, background: 'var(--accent-yellow)' }}
            >
              {generatingInsight ? (
                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Sparkles size={16} />
              )}
              {generatingInsight ? 'Gerando…' : 'Diagnóstico do Mestre'}
            </button>
          </div>
        </div>
      </div>

      {/* SEÇÃO 1 — Posição na apuração */}
      <SectionCard
        icon={<Trophy size={20} />}
        title="1. Posição na Apuração TSE"
        color="var(--accent-green-bright)"
      >
        {myCandidate ? (
          <div style={statsGrid}>
            <Stat label="Colocação" value={`${myCandidate.candidate_seq ?? '—'}º`} highlight />
            <Stat label="Votos" value={fmtNum(myCandidate.candidate_votes)} />
            <Stat label="% dos válidos" value={fmtPct(myCandidate.candidate_percentage)} />
            <Stat
              label="Resultado"
              value={myCandidate.candidate_is_elected ? '✓ ELEITO' : 'NÃO ELEITO'}
              color={
                myCandidate.candidate_is_elected
                  ? 'var(--accent-green-bright)'
                  : 'var(--text-gray)'
              }
            />
            <Stat label="Eleitorado município" value={fmtNum(apuracao.aggregate?.totalVoters)} />
            <Stat
              label="Comparecimento"
              value={`${fmtNum(apuracao.aggregate?.totalPresent)} (${fmtPct(
                apuracao.aggregate?.pctPresent
              )})`}
            />
            <Stat
              label="% Seções apuradas"
              value={fmtPct(apuracao.aggregate?.pctSectionsCounted, 1)}
            />
            <Stat label="Vagas em disputa" value={fmtNum(apuracao.role?.seats)} />
          </div>
        ) : (
          <p style={{ color: 'var(--text-gray)' }}>
            Candidato "{candidateHint}" não encontrado na apuração oficial.
          </p>
        )}
      </SectionCard>

      {/* SEÇÃO 2 — Prestação de contas */}
      <SectionCard
        icon={<DollarSign size={20} />}
        title="2. Prestação de Contas Eleitorais"
        color="var(--accent-yellow)"
      >
        {gastos ? (
          <>
            <div style={statsGrid}>
              <Stat label="Receita total" value={fmtBRL(gastos.total_receita)} />
              <Stat label="Despesa total" value={fmtBRL(gastos.total_despesa)} highlight />
              <Stat label="Recursos próprios" value={fmtBRL(gastos.total_doacoes_proprio)} />
              <Stat label="Limite legal TSE" value={fmtBRL(gastos.limite_legal)} />
              <Stat
                label="Custo por voto"
                value={gastos.custo_por_voto ? fmtBRL(gastos.custo_por_voto) : '—'}
              />
              <Stat
                label="Uso do limite"
                value={fmtPct(gastos.taxa_uso_limite, 1)}
                color={gastos.taxa_uso_limite > 90 ? '#EF4444' : 'var(--text-white)'}
              />
            </div>
            <div
              style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-gray)' }}
            >
              Status: <strong>{gastos.prestacao_status || '—'}</strong>
            </div>
          </>
        ) : (
          <div
            style={{
              padding: '1rem',
              background: 'rgba(255, 204, 0, 0.05)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              color: 'var(--text-gray)'
            }}
          >
            ⚠️ Prestação de contas ainda não cacheada. Execute localmente:
            <pre
              style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                color: 'var(--accent-yellow)'
              }}
            >
              node scripts/preload-tse-gastos.js --city=&quot;{apuracao?.municipality?.name}
              &quot; --role={role}
            </pre>
          </div>
        )}
      </SectionCard>

      {/* SEÇÃO 3 — Distribuição geográfica */}
      <SectionCard
        icon={<MapPin size={20} />}
        title="3. Distribuição de Votos por Zona Eleitoral"
        color="var(--accent-blue-bright)"
      >
        {secoes?.zones ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: 'rgba(20,30,60,0.04)' }}>
                  <th style={thStyle}>Zona</th>
                  <th style={thStyle}>Votos</th>
                  <th style={thStyle}>% do total</th>
                  <th style={thStyle}>Seções</th>
                </tr>
              </thead>
              <tbody>
                {secoes.zones.map((z) => {
                  const pct = myCandidate?.candidate_votes
                    ? ((z.votes / myCandidate.candidate_votes) * 100).toFixed(1)
                    : '—';
                  return (
                    <tr
                      key={z.electoral_zone}
                      style={{ borderBottom: '1px solid var(--border-gray)' }}
                    >
                      <td style={tdStyle}>
                        <strong>{z.electoral_zone}</strong>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{fmtNum(z.votes)}</td>
                      <td style={tdStyle}>{pct}%</td>
                      <td style={tdStyle}>{z.sections}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-gray)' }}>
              Total de {secoes.total_sections} seções com voto registrado.
            </p>
          </div>
        ) : (
          <div
            style={{
              padding: '1rem',
              background: 'rgba(56, 189, 248, 0.05)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              color: 'var(--text-gray)'
            }}
          >
            ⚠️ Boletim por seção ainda não cacheado. Execute localmente:
            <pre
              style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                color: 'var(--accent-blue-bright)'
              }}
            >
              node scripts/preload-tse-secoes.js --city=&quot;{apuracao?.municipality?.name}
              &quot; --role={role}
            </pre>
          </div>
        )}
      </SectionCard>

      {/* SEÇÃO 4 — Diagnóstico do Mestre */}
      <SectionCard
        icon={<Brain size={20} />}
        title="4. Diagnóstico Estratégico do Mestre AI"
        color="var(--accent-yellow)"
      >
        {!mestreInsight && !generatingInsight && (
          <p style={{ color: 'var(--text-gray)' }}>
            Clique em <strong>Diagnóstico do Mestre</strong> acima para que a IA analise os
            dados cruzados e gere recomendações táticas baseadas em fatos reais TSE.
          </p>
        )}
        {generatingInsight && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--text-gray)'
            }}
          >
            <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Mestre consultando dados oficiais e elaborando o diagnóstico…</span>
          </div>
        )}
        {mestreInsight?.error && (
          <p style={{ color: '#EF4444' }}>Erro: {mestreInsight.error}</p>
        )}
        {mestreInsight?.text && (
          <>
            <div
              style={{
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
                fontSize: '0.9rem',
                color: 'var(--text-white)'
              }}
            >
              {mestreInsight.text}
            </div>
            {mestreInsight.tools_used?.length > 0 && (
              <p style={{ marginTop: '1rem', fontSize: '0.7rem', color: 'var(--text-gray)' }}>
                Ferramentas consultadas: {mestreInsight.tools_used.map((t) => t.name).join(' · ')}{' '}
                <CheckCircle2
                  size={12}
                  style={{ display: 'inline', verticalAlign: 'middle' }}
                />
              </p>
            )}
          </>
        )}
      </SectionCard>

      <p
        style={{
          fontSize: '0.7rem',
          color: 'var(--text-gray)',
          textAlign: 'center',
          marginTop: '0.5rem'
        }}
      >
        Dados oficiais: TSE (resultados.tse.jus.br e divulgacandcontas.tse.jus.br) · Compilado
        por e-politica.ia
      </p>
    </div>
  );
}

// =========================================================================
// Sub-componentes & estilos
// =========================================================================
function SectionCard({ icon, title, color, children }) {
  return (
    <section className="glass" style={{ padding: '1.5rem' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          marginBottom: '1rem',
          paddingBottom: '0.6rem',
          borderBottom: '1px solid var(--border-gray)'
        }}
      >
        <span style={{ color }}>{icon}</span>
        <h3
          style={{
            fontFamily: 'var(--font-title)',
            fontSize: '1.1rem',
            fontWeight: 700,
            margin: 0
          }}
        >
          {title}
        </h3>
      </header>
      {children}
    </section>
  );
}

function Stat({ label, value, highlight, color }) {
  return (
    <div>
      <span
        style={{
          fontSize: '0.7rem',
          color: 'var(--text-gray)',
          textTransform: 'uppercase',
          fontWeight: 600
        }}
      >
        {label}
      </span>
      <h4
        style={{
          fontSize: highlight ? '1.5rem' : '1.05rem',
          fontWeight: 800,
          marginTop: '4px',
          color:
            color || (highlight ? 'var(--accent-green-bright)' : 'var(--text-white)')
        }}
      >
        {value}
      </h4>
    </div>
  );
}

const statsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '1rem'
};
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' };
const thStyle = {
  textAlign: 'left',
  padding: '0.6rem 0.75rem',
  color: 'var(--text-gray)',
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  fontWeight: 700,
  letterSpacing: '0.05em'
};
const tdStyle = { padding: '0.6rem 0.75rem' };
const primaryBtnStyle = {
  background: 'var(--accent-green)',
  color: 'var(--bg-dark)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  padding: '0.6rem 1rem',
  fontSize: '0.85rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem'
};
