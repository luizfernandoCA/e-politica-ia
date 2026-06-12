import { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Users,
  BarChart3,
  Brain,
  FileText,
  RefreshCw,
  Download,
  ExternalLink,
  Award,
  Vote,
  GitCompare,
  X
} from 'lucide-react';
import DataSourceBadge from '../components/DataSourceBadge';

/**
 * Apuração TSE — paridade com o Politique mobile.
 *
 * Consome /api/tse-apuracao (cached em public.tse_apuracao via job de
 * preload local). Mostra cinco visões em tabs internos:
 *   1. Coligação  — agregados de eleição + tabela de partidos
 *   2. Desempenho — card do candidato selecionado
 *   3. Votação    — ranking de todos os candidatos
 *   4. Análise IA — handoff para o Mestre
 *   5. Relatório  — exportação CSV
 */

const TABS = [
  { id: 'coligacao', label: 'Coligação', icon: Users },
  { id: 'desempenho', label: 'Desempenho', icon: Award },
  { id: 'votacao', label: 'Votação', icon: BarChart3 },
  { id: 'comparar', label: 'Comparar', icon: GitCompare },
  { id: 'ia', label: 'Análise IA', icon: Brain },
  { id: 'relatorio', label: 'Relatório', icon: FileText }
];

function formatNumber(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('pt-BR').format(n);
}

function formatPercent(n, decimals = 2) {
  if (n == null) return '—';
  return `${Number(n).toFixed(decimals).replace('.', ',')}%`;
}

function readCampaignParams() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('campaignParams');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function downloadCsv(filename, candidates) {
  const headers = [
    'colocacao',
    'numero',
    'nome_urna',
    'partido',
    'votos',
    'percentual',
    'resultado'
  ];
  const rows = candidates.map((c) => [
    c.candidate_seq ?? '',
    c.candidate_number ?? '',
    `"${(c.candidate_urn_name || '').replace(/"/g, '""')}"`,
    c.party_abbr ?? '',
    c.candidate_votes ?? 0,
    c.candidate_percentage ?? 0,
    `"${(c.candidate_outcome || '').replace(/"/g, '""')}"`
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ApuracaoTSE() {
  const params = readCampaignParams();
  const [activeTab, setActiveTab] = useState('coligacao');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [year, setYear] = useState(2024);
  const [role, setRole] = useState(params?.role || 'Vereador');

  const city = params?.city || 'PORTO VELHO';

  const [reloadKey, setReloadKey] = useState(0);

  /* eslint-disable react-hooks/set-state-in-effect --
     Padrão "fetch on mount/deps change" intencional: o setState abre o
     loading spinner antes do fetch resolver. Alternativas (useTransition,
     use()) não se aplicam bem aqui. */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = `/api/tse-apuracao?city=${encodeURIComponent(city)}&role=${role}&year=${year}`;
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (!json.success) throw new Error(json.error || 'Falha ao buscar apuração.');
        setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year, role, city, reloadKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const loadData = () => setReloadKey((k) => k + 1);

  // ----------------------------------------------------------------- partidos
  const partidos = useMemo(() => {
    if (!data?.candidates) return [];
    const grouped = {};
    for (const c of data.candidates) {
      const key = c.party_abbr || '—';
      if (!grouped[key]) {
        grouped[key] = {
          abbr: c.party_abbr,
          number: c.party_number,
          name: c.party_name,
          total_nominal: c.party_total_nominal_votes,
          total_legend: c.party_total_legend_votes,
          total_valid: c.party_total_valid_votes,
          seats_elected: c.party_seats_elected,
          candidates_count: 0,
          elected_count: 0
        };
      }
      grouped[key].candidates_count += 1;
      if (c.candidate_is_elected) grouped[key].elected_count += 1;
    }
    return Object.values(grouped).sort(
      (a, b) => (b.total_nominal ?? 0) - (a.total_nominal ?? 0)
    );
  }, [data]);

  // -------------------------------------------------------------- desempenho
  const selectedCandidate = useMemo(() => {
    if (!data?.candidates || !params?.candidateName) return null;
    const target = params.candidateName.toUpperCase();
    return (
      data.candidates.find(
        (c) =>
          c.candidate_urn_name?.toUpperCase().includes(target) ||
          c.candidate_name?.toUpperCase().includes(target)
      ) ||
      // Fallback: o mais votado
      data.candidates[0]
    );
  }, [data, params?.candidateName]);

  // ------------------------------------------------------------------ render
  return (
    <div style={{ padding: '1rem', minHeight: '100vh', background: 'var(--bg-dark)' }}>
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
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
            Apuração Oficial TSE
            <DataSourceBadge kind="official" size="lg" />
          </h1>
          <p style={{ color: 'var(--text-gray)', margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
            Dados de {data?.source ?? 'resultados.tse.jus.br'} ·{' '}
            {data?.lastFetchedAt
              ? new Date(data.lastFetchedAt).toLocaleString('pt-BR')
              : '—'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            style={selectStyle}
          >
            <option value={2024}>2024 · 1º Turno</option>
            <option value={2020}>2020 · 1º Turno</option>
          </select>
          <select value={role} onChange={(e) => setRole(e.target.value)} style={selectStyle}>
            <option value="Prefeito">Prefeito</option>
            <option value="Vereador">Vereador</option>
          </select>
          <button onClick={loadData} disabled={loading} style={refreshBtnStyle}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Carregando' : 'Atualizar'}
          </button>
        </div>
      </header>

      {/* Resumo do município (sempre visível) */}
      {data && (
        <section
          className="glass"
          style={{ padding: '1rem 1.25rem', marginBottom: '1rem', borderRadius: 'var(--radius-md)' }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-gray)' }}>
                Município
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{data.municipality?.name}</div>
            </div>
            <Metric label="Eleitorado" value={formatNumber(data.aggregate?.totalVoters)} />
            <Metric label="Comparecimento" value={formatNumber(data.aggregate?.totalPresent)} />
            <Metric label="% Comparecimento" value={formatPercent(data.aggregate?.pctPresent)} />
            <Metric
              label="Seções apuradas"
              value={`${formatNumber(data.aggregate?.sectionsCounted)} / ${formatNumber(
                data.aggregate?.sectionsTotal
              )} (${formatPercent(data.aggregate?.pctSectionsCounted, 1)})`}
            />
            <Metric label="Vagas em disputa" value={formatNumber(data.role?.seats)} />
          </div>
        </section>
      )}

      {/* Tabs */}
      <nav
        style={{
          display: 'flex',
          gap: '0.25rem',
          borderBottom: '1px solid var(--border-gray)',
          marginBottom: '1rem',
          overflowX: 'auto'
        }}
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                background: active ? 'rgba(0, 200, 150, 0.12)' : 'transparent',
                color: active ? 'var(--accent-green)' : 'var(--text-gray)',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: active ? '2px solid var(--accent-green)' : '2px solid transparent',
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: active ? 700 : 500,
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Conteúdo das tabs */}
      {loading && (
        <p style={{ color: 'var(--text-gray)', padding: '2rem', textAlign: 'center' }}>
          Carregando apuração…
        </p>
      )}
      {error && (
        <p style={{ color: 'var(--accent-red, #EF4444)', padding: '1rem' }}>Erro: {error}</p>
      )}

      {data && !loading && (
        <>
          {activeTab === 'coligacao' && <TabColigacao partidos={partidos} />}
          {activeTab === 'desempenho' && (
            <TabDesempenho candidate={selectedCandidate} data={data} year={year} role={role} />
          )}
          {activeTab === 'votacao' && <TabVotacao candidates={data.candidates} />}
          {activeTab === 'comparar' && (
            // key força re-mount quando troca cargo/ano (evita useEffect+setState
            // que dispara warning do React 19 sobre cascading renders).
            <TabComparar key={`${role}-${year}`} candidates={data.candidates} />
          )}
          {activeTab === 'ia' && <TabIA city={data.municipality?.name} role={role} />}
          {activeTab === 'relatorio' && (
            <TabRelatorio
              candidates={data.candidates}
              city={data.municipality?.name}
              role={role}
              year={year}
            />
          )}
        </>
      )}
    </div>
  );
}

// =========================================================================
// Sub-componentes
// =========================================================================

function Metric({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-gray)' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function TabColigacao({ partidos }) {
  if (partidos.length === 0)
    return <p style={{ color: 'var(--text-gray)' }}>Sem dados de partidos.</p>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr style={{ background: 'rgba(20,30,60,0.04)' }}>
            <th style={thStyle}>Partido</th>
            <th style={thStyle}>Votos nominais</th>
            <th style={thStyle}>Legenda</th>
            <th style={thStyle}>Eleitos</th>
            <th style={thStyle}>Candidatos</th>
          </tr>
        </thead>
        <tbody>
          {partidos.map((p) => (
            <tr key={p.abbr} style={{ borderBottom: '1px solid var(--border-gray)' }}>
              <td style={tdStyle}>
                <strong>{p.abbr}</strong> · {p.number}
              </td>
              <td style={tdStyle}>{formatNumber(p.total_nominal)}</td>
              <td style={tdStyle}>{formatNumber(p.total_legend)}</td>
              <td style={{ ...tdStyle, color: 'var(--accent-green)', fontWeight: 700 }}>
                {p.elected_count}
              </td>
              <td style={tdStyle}>{p.candidates_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabDesempenho({ candidate, data, year, role }) {
  if (!candidate)
    return <p style={{ color: 'var(--text-gray)' }}>Candidato não encontrado nesta apuração.</p>;

  const colocacao = candidate.candidate_seq;
  const total = data.candidates.length;

  return (
    <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div
          style={{
            background: 'var(--accent-blue-glow)',
            color: 'var(--text-white)',
            width: 72,
            height: 72,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontSize: '2rem'
          }}
        >
          👤
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-gray)' }}>
            {candidate.party_abbr} · {candidate.candidate_number}
          </div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', margin: '0.25rem 0' }}>
            {candidate.candidate_urn_name || candidate.candidate_name}
          </h2>
          {candidate.candidate_outcome && (
            <span
              style={{
                color: candidate.candidate_is_elected ? 'var(--accent-green)' : 'var(--text-gray)',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}
            >
              {candidate.candidate_outcome.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <hr style={{ borderColor: 'var(--border-gray)', margin: '1rem 0', opacity: 0.4 }} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1rem'
        }}
      >
        <BigStat
          icon={<Trophy size={18} />}
          label="Colocação"
          value={`${colocacao}º`}
          sub={`de ${total}`}
        />
        <BigStat
          icon={<Vote size={18} />}
          label="dos válidos"
          value={formatPercent(candidate.candidate_percentage, 2)}
        />
        <BigStat
          icon={<BarChart3 size={18} />}
          label="votos"
          value={formatNumber(candidate.candidate_votes)}
        />
      </div>

      <p style={{ marginTop: '1.25rem', color: 'var(--text-gray)', fontSize: '0.8rem' }}>
        Eleição {year} · 1º Turno · RO · Cargo: {role}
        <br />
        Fonte: TSE / resultados.tse.jus.br
      </p>
    </div>
  );
}

function BigStat({ icon, label, value, sub }) {
  return (
    <div
      style={{
        background: 'rgba(20,30,60,0.03)',
        padding: '1rem',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-gray)'
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-gray)' }}
      >
        {icon}
        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-gray)' }}>{sub}</div>}
    </div>
  );
}

function TabVotacao({ candidates }) {
  const sorted = useMemo(
    () =>
      [...candidates].sort(
        (a, b) => (a.candidate_seq ?? 9999) - (b.candidate_seq ?? 9999)
      ),
    [candidates]
  );

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr style={{ background: 'rgba(20,30,60,0.04)' }}>
            <th style={thStyle}>#</th>
            <th style={thStyle}>Candidato</th>
            <th style={thStyle}>Partido</th>
            <th style={thStyle}>Votos</th>
            <th style={thStyle}>%</th>
            <th style={thStyle}>Resultado</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <tr
              key={c.candidate_sq || c.candidate_number}
              style={{ borderBottom: '1px solid var(--border-gray)' }}
            >
              <td style={{ ...tdStyle, color: 'var(--text-gray)' }}>{c.candidate_seq ?? '—'}</td>
              <td style={tdStyle}>
                <strong>{c.candidate_urn_name || c.candidate_name}</strong>
              </td>
              <td style={tdStyle}>
                {c.party_abbr} · {c.candidate_number}
              </td>
              <td style={{ ...tdStyle, fontWeight: 700 }}>{formatNumber(c.candidate_votes)}</td>
              <td style={tdStyle}>{formatPercent(c.candidate_percentage)}</td>
              <td
                style={{
                  ...tdStyle,
                  color: c.candidate_is_elected ? 'var(--accent-green)' : 'var(--text-gray)',
                  fontWeight: c.candidate_is_elected ? 700 : 400
                }}
              >
                {c.candidate_outcome || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabComparar({ candidates }) {
  // Sugere os 3 mais votados como pré-seleção
  const top3 = useMemo(
    () =>
      [...candidates]
        .sort((a, b) => (a.candidate_seq ?? 9999) - (b.candidate_seq ?? 9999))
        .slice(0, 3)
        .map((c) => c.candidate_sq),
    [candidates]
  );

  const [selected, setSelected] = useState(top3);

  const selectedData = useMemo(
    () => selected.map((sq) => candidates.find((c) => c.candidate_sq === sq)).filter(Boolean),
    [selected, candidates]
  );

  const maxVotes = useMemo(
    () => Math.max(0, ...selectedData.map((c) => c.candidate_votes ?? 0)),
    [selectedData]
  );

  const totalVotosSelecionados = useMemo(
    () => selectedData.reduce((acc, c) => acc + (c.candidate_votes ?? 0), 0),
    [selectedData]
  );

  function updateSlot(i, newSq) {
    const copy = [...selected];
    copy[i] = newSq;
    setSelected(copy);
  }

  function removeSlot(i) {
    setSelected(selected.filter((_, idx) => idx !== i));
  }

  function addSlot() {
    if (selected.length >= 4) return;
    const next = candidates.find((c) => !selected.includes(c.candidate_sq));
    if (next) setSelected([...selected, next.candidate_sq]);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Controles de seleção */}
      <div className="glass" style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)' }}>
        <h3
          style={{
            fontFamily: 'var(--font-title)',
            fontSize: '1rem',
            margin: '0 0 0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <GitCompare size={16} color="var(--accent-green)" />
          Selecione candidatos para comparar
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {selected.map((sq, i) => (
            <div
              key={`slot-${i}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <select
                value={sq}
                onChange={(e) => updateSlot(i, e.target.value)}
                style={{ ...selectStyle, minWidth: 220 }}
              >
                {candidates.map((c) => (
                  <option key={c.candidate_sq} value={c.candidate_sq}>
                    {c.candidate_seq ? `${c.candidate_seq}º · ` : ''}
                    {c.candidate_urn_name || c.candidate_name} ({c.party_abbr})
                  </option>
                ))}
              </select>
              {selected.length > 1 && (
                <button
                  onClick={() => removeSlot(i)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-gray)',
                    color: 'var(--text-gray)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.4rem',
                    cursor: 'pointer'
                  }}
                  title="Remover slot"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          {selected.length < 4 && (
            <button onClick={addSlot} style={refreshBtnStyle}>
              + adicionar
            </button>
          )}
        </div>
      </div>

      {/* Comparativo em cards */}
      {selectedData.length === 0 ? (
        <p style={{ color: 'var(--text-gray)' }}>Selecione ao menos um candidato.</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
            gap: '1rem'
          }}
        >
          {selectedData.map((c) => {
            const isLeader = (c.candidate_votes ?? 0) === maxVotes && maxVotes > 0;
            const pctNoTotal =
              totalVotosSelecionados > 0
                ? (((c.candidate_votes ?? 0) / totalVotosSelecionados) * 100).toFixed(1)
                : '0.0';
            return (
              <article
                key={c.candidate_sq}
                className="glass"
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: isLeader
                    ? '2px solid var(--accent-green)'
                    : '1px solid var(--border-gray)',
                  position: 'relative'
                }}
              >
                {isLeader && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '12px',
                      background: 'var(--accent-green)',
                      color: 'var(--bg-dark)',
                      padding: '2px 10px',
                      borderRadius: '100px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Trophy size={12} /> Líder do grupo
                  </span>
                )}
                <div
                  style={{
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    color: 'var(--text-gray)'
                  }}
                >
                  {c.party_abbr} · {c.candidate_number}
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-title)',
                    fontSize: '1.1rem',
                    margin: '0.2rem 0 0.4rem'
                  }}
                >
                  {c.candidate_urn_name || c.candidate_name}
                </h3>
                {c.candidate_outcome && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: c.candidate_is_elected ? 'var(--accent-green)' : 'var(--text-gray)',
                      fontWeight: 700
                    }}
                  >
                    {c.candidate_outcome.toUpperCase()}
                  </span>
                )}
                <hr style={{ borderColor: 'var(--border-gray)', margin: '0.75rem 0', opacity: 0.3 }} />
                <CompStat label="Colocação" value={c.candidate_seq ? `${c.candidate_seq}º` : '—'} />
                <CompStat label="Votos" value={formatNumber(c.candidate_votes)} highlight />
                <CompStat
                  label="% dos válidos"
                  value={formatPercent(c.candidate_percentage)}
                />
                <CompStat label="% no comparativo" value={`${pctNoTotal}%`} />
              </article>
            );
          })}
        </div>
      )}

      {/* Análise textual */}
      {selectedData.length >= 2 && maxVotes > 0 && (
        <div className="glass" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', margin: '0 0 0.75rem' }}>
            Análise rápida
          </h3>
          <ComparAnalysis selectedData={selectedData} maxVotes={maxVotes} />
        </div>
      )}
    </div>
  );
}

function CompStat({ label, value, highlight }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '0.3rem 0',
        fontSize: '0.85rem'
      }}
    >
      <span style={{ color: 'var(--text-gray)' }}>{label}</span>
      <strong
        style={{
          fontSize: highlight ? '1.1rem' : '0.95rem',
          color: highlight ? 'var(--accent-green)' : 'var(--text-white)'
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function ComparAnalysis({ selectedData, maxVotes }) {
  const leader = selectedData.find((c) => (c.candidate_votes ?? 0) === maxVotes);
  const others = selectedData.filter((c) => c.candidate_sq !== leader.candidate_sq);

  return (
    <ul style={{ color: 'var(--text-gray)', paddingLeft: '1.25rem', margin: 0, fontSize: '0.85rem' }}>
      <li style={{ marginBottom: '0.4rem' }}>
        <strong style={{ color: 'var(--accent-green)' }}>{leader.candidate_urn_name}</strong>{' '}
        lidera com <strong>{formatNumber(leader.candidate_votes)}</strong> votos (
        {formatPercent(leader.candidate_percentage)} dos válidos).
      </li>
      {others.map((c) => {
        const diff = (leader.candidate_votes ?? 0) - (c.candidate_votes ?? 0);
        const pctDiff = c.candidate_votes
          ? ((diff / c.candidate_votes) * 100).toFixed(1)
          : '∞';
        return (
          <li key={c.candidate_sq} style={{ marginBottom: '0.4rem' }}>
            <strong>{c.candidate_urn_name}</strong> teve <strong>{formatNumber(c.candidate_votes)}</strong>{' '}
            votos — {formatNumber(diff)} a menos que {leader.candidate_urn_name} ({pctDiff}%).
          </li>
        );
      })}
      <li style={{ marginTop: '0.6rem', fontSize: '0.8rem', fontStyle: 'italic' }}>
        Para análise estratégica avançada com Claude Sonnet 4.6, acesse a aba <strong>Análise IA</strong>.
      </li>
    </ul>
  );
}

function TabIA({ city, role }) {
  return (
    <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <Brain size={24} color="var(--accent-yellow)" />
        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', margin: 0 }}>
          Análise IA — Mestre
        </h2>
      </div>
      <p style={{ color: 'var(--text-gray)', marginBottom: '1rem' }}>
        A Mestre (Claude Sonnet 4.6) pode analisar este resultado eleitoral e gerar:
      </p>
      <ul style={{ color: 'var(--text-gray)', paddingLeft: '1.25rem', marginBottom: '1rem' }}>
        <li>SWOT estratégico baseado nesse cenário de {city} ({role})</li>
        <li>Análise de oposição: principais adversários e suas bases</li>
        <li>Recomendações táticas por território</li>
        <li>Comparativo com ciclo eleitoral anterior</li>
      </ul>
      <p style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>
        Clique em <strong>Mestre AI</strong> no menu lateral para conversar com a IA — o
        contexto da campanha já é injetado automaticamente no prompt.
      </p>
    </div>
  );
}

function TabRelatorio({ candidates, city, role, year }) {
  const filename = `apuracao-${city?.toLowerCase().replace(/\s+/g, '-')}-${role.toLowerCase()}-${year}.csv`;

  return (
    <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
      <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', margin: '0 0 0.5rem' }}>
        Exportar relatório
      </h2>
      <p style={{ color: 'var(--text-gray)', marginBottom: '1rem' }}>
        Todos os {candidates.length} candidatos de {city} ({role}) na eleição {year}, em CSV
        UTF-8 com BOM (Excel-friendly). Inclui colocação, votos, % e resultado oficial.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => downloadCsv(filename, candidates)} style={primaryBtnStyle}>
          <Download size={16} /> Baixar CSV ({candidates.length} linhas)
        </button>
        <a
          href={`https://resultados.tse.jus.br/oficial/app/index.html#/eleicao;e=e${
            year === 2024 ? '619' : '426'
          };uf=ro/dados-de-urna/resultados`}
          target="_blank"
          rel="noopener noreferrer"
          style={secondaryBtnStyle}
        >
          <ExternalLink size={16} /> Abrir no portal TSE
        </a>
      </div>
      <p style={{ marginTop: '1.25rem', color: 'var(--text-gray)', fontSize: '0.8rem' }}>
        Próximos formatos no roadmap: PDF executivo, JSON estruturado, e mapa por bairro/seção
        (depende de integração com endpoint TSE de seção, fora desta versão).
      </p>
    </div>
  );
}

// =========================================================================
// estilos compartilhados
// =========================================================================
const selectStyle = {
  background: 'var(--bg-card)',
  color: 'var(--text-white)',
  border: '1px solid var(--border-gray)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.4rem 0.6rem',
  fontSize: '0.85rem'
};
const refreshBtnStyle = {
  background: 'rgba(0, 200, 150, 0.1)',
  color: 'var(--accent-green)',
  border: '1px solid var(--accent-green)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.4rem 0.85rem',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem'
};
const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.85rem'
};
const thStyle = {
  textAlign: 'left',
  padding: '0.6rem 0.75rem',
  color: 'var(--text-gray)',
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  fontWeight: 700,
  letterSpacing: '0.05em'
};
const tdStyle = {
  padding: '0.6rem 0.75rem'
};
const primaryBtnStyle = {
  background: 'var(--accent-green)',
  color: 'var(--bg-dark)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  padding: '0.6rem 1.1rem',
  fontSize: '0.9rem',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem'
};
const secondaryBtnStyle = {
  background: 'transparent',
  color: 'var(--text-white)',
  border: '1px solid var(--border-gray)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.6rem 1.1rem',
  fontSize: '0.9rem',
  fontWeight: 500,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem'
};
