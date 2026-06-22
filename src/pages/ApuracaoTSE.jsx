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
  Calculator,
  X
} from 'lucide-react';
import DataSourceBadge from '../components/DataSourceBadge';
import { UF_DATA } from '../data/ufElectoral';

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
  { id: 'coeficiente', label: 'Coeficiente', icon: Calculator },
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
  // A apuração oficial que temos é MUNICIPAL (RO/2024-2020). Se o candidato
  // disputa cargo estadual/federal (2026), essa apuração é só CONTEXTO do
  // município — não a candidatura dele. Nesse caso, abrimos no Coeficiente.
  const isMunicipalCargo = ['prefeito', 'vereador'].includes((params?.role || '').toLowerCase());
  const [activeTab, setActiveTab] = useState(isMunicipalCargo ? 'coligacao' : 'coeficiente');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [year, setYear] = useState(2024);
  // Para a apuração municipal de contexto, usa cargo municipal válido.
  const [role, setRole] = useState(params?.role || 'Prefeito');

  const city = params?.city || (isMunicipalCargo ? 'PORTO VELHO' : '');

  const [reloadKey, setReloadKey] = useState(0);

  /* eslint-disable react-hooks/set-state-in-effect --
     Padrão "fetch on mount/deps change" intencional: o setState abre o
     loading spinner antes do fetch resolver. Alternativas (useTransition,
     use()) não se aplicam bem aqui. */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    // Para apuração TSE 2024/2020 só temos cargos municipais. Se o usuário disputa
    // cargo estadual+ em 2026, buscamos a apuração de Prefeito como CONTEXTO do município
    // — o TabCoeficiente já recebe o role real e calcula a projeção 2026 corretamente.
    const roleForApuracao = ['Prefeito','Vereador'].includes(role) ? role : 'Prefeito';
    const url = `/api/tse-apuracao?city=${encodeURIComponent(city)}&role=${roleForApuracao}&year=${year}`;
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
            <option value="Deputado Estadual">Deputado Estadual</option>
            <option value="Deputado Federal">Deputado Federal</option>
            <option value="Senador">Senador</option>
            <option value="Governador">Governador</option>
          </select>
          <button onClick={loadData} disabled={loading} style={refreshBtnStyle}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Carregando' : 'Atualizar'}
          </button>
        </div>
      </header>

      {/* Aviso quando o candidato disputa cargo 2026 (não municipal):
          a apuração 2024 abaixo é contexto do município, não a candidatura dele. */}
      {!isMunicipalCargo && (
        <section
          className="glass"
          style={{ padding: '0.9rem 1.1rem', marginBottom: '1rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--accent-yellow)' }}
        >
          <strong style={{ color: 'var(--accent-yellow)' }}>⚠️ Candidatura 2026: {params?.candidateName ? `${params.candidateName} · ` : ''}{params?.role}/{params?.state || 'BR'}</strong>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-gray)', margin: '0.4rem 0 0', lineHeight: 1.5 }}>
            A eleição geral de 2026 ocorre em outubro — ainda <strong>não há apuração</strong>. A apuração oficial de {year} mostrada abaixo é a <strong>última eleição MUNICIPAL de {city}</strong> (contexto), <strong>não</strong> a candidatura deste candidato. Para a projeção de 2026, use a aba <strong>Coeficiente</strong>.
          </p>
        </section>
      )}

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
          {activeTab === 'coeficiente' && (
            <TabCoeficiente role={role} data={data} />
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

// =========================================================================
// TabCoeficiente — Quociente Eleitoral do cargo (eleições 2026).
// Proporcional (Dep. Federal/Estadual, Vereador): QE = votos válidos ÷ vagas.
// Majoritário (Senador, Governador, Prefeito, Presidente): QE não se aplica.
// Fonte: TSE (quociente eleitoral) + Código Eleitoral, arts. 106-109.
// Pré-2026 é PROJEÇÃO sobre o eleitorado — rotulada como estimativa.
// =========================================================================
function classifyCargo(role) {
  const r = (role || '').toLowerCase();
  if (r.includes('deputad') || r.includes('vereador')) return 'proporcional';
  if (r.includes('senador')) return 'senador';
  if (r.includes('governador')) return 'governador';
  if (r.includes('prefeito')) return 'prefeito';
  if (r.includes('presidente')) return 'presidente';
  return 'proporcional';
}

// QE pela regra do TSE: despreza a fração se ≤ 0,5; arredonda p/ 1 se > 0,5.
function quocienteEleitoral(votosValidos, vagas) {
  if (!vagas || vagas <= 0) return 0;
  const q = votosValidos / vagas;
  const frac = q - Math.floor(q);
  return frac > 0.5 ? Math.ceil(q) : Math.floor(q);
}

function TabCoeficiente({ role, data }) {
  const tipo = classifyCargo(role);
  const params = (() => {
    try {
      return typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('campaignParams') || 'null')
        : null;
    } catch { return null; }
  })();
  const uf = params?.state || data?.uf || '';
  const ufInfo = UF_DATA[uf] || null;
  const roleIsMunicipal = (role || '').toLowerCase().includes('vereador') || (role || '').toLowerCase().includes('prefeito');
  // Vereador/Prefeito → eleitorado do MUNICÍPIO; demais cargos → do ESTADO.
  const eleitoradoBase = roleIsMunicipal ? (data?.aggregate?.totalVoters || 0) : (ufInfo?.eleitorado || 0);

  const [eleitorado, setEleitorado] = useState(eleitoradoBase ? String(eleitoradoBase) : '');
  const [comparecimento, setComparecimento] = useState('80');
  const [pctValidos, setPctValidos] = useState('90');
  const [vagas, setVagas] = useState(
    (role || '').toLowerCase().includes('vereador') && data?.role?.seats ? String(data.role.seats) : ''
  );
  // Bancada federal do estado prefilled da base oficial → deriva as estaduais.
  const [depFederais, setDepFederais] = useState(ufInfo?.depFed ? String(ufInfo.depFed) : '');
  const [federacaoLabel, setFederacaoLabel] = useState('');

  const roleLower = (role || '').toLowerCase();
  const isDepEstadual = roleLower.includes('estadual');
  const isDepFederal = roleLower.includes('federal');
  const isDeputado = isDepEstadual || isDepFederal;

  const eN = Number(String(eleitorado).replace(/\D/g, '')) || 0;
  const comp = Math.min(Math.max(Number(comparecimento) || 0, 0), 100);
  const val = Math.min(Math.max(Number(pctValidos) || 0, 0), 100);
  const fedN = Number(depFederais) || 0;
  // Assembleia Legislativa (CF, art. 27): 3× a bancada federal até atingir 36;
  // a partir daí, +1 estadual por federal que exceder 12.
  const estadualSeats = fedN > 12 ? 36 + (fedN - 12) : fedN * 3;
  // Vagas efetivas que entram no QE conforme o cargo.
  const vagasEfetivas = isDepEstadual ? estadualSeats : isDepFederal ? fedN : (Number(vagas) || 0);
  const votosValidos = Math.round(eN * (comp / 100) * (val / 100));
  const qe = quocienteEleitoral(votosValidos, vagasEfetivas);
  // Coeficiente "bruto": aptos a votar ÷ cadeiras (referência simples e direta).
  const coefBruto = vagasEfetivas > 0 ? Math.round(eN / vagasEfetivas) : 0;

  const inputStyle = {
    width: '100%', padding: '10px 12px', background: 'var(--bg-dark)',
    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
    color: 'var(--text-white)', fontSize: '0.9rem'
  };
  const labelStyle = { fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' };
  const card = { background: 'rgba(20,30,60,0.25)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1.25rem' };

  const isMajoritario = tipo === 'senador' || tipo === 'governador' || tipo === 'prefeito' || tipo === 'presidente';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '760px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Calculator size={18} style={{ color: 'var(--accent-blue-bright)' }} />
        <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-title)', fontWeight: 700, margin: 0 }}>
          Coeficiente eleitoral · {role} ({uf}) · 2026
        </h3>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 8px', borderRadius: '100px', background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}>
          Projeção · estimativa
        </span>
      </div>

      {isMajoritario ? (
        <div style={card}>
          <strong style={{ color: 'var(--accent-yellow)' }}>Cargo majoritário — não há quociente eleitoral.</strong>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-gray)', marginTop: '0.5rem', lineHeight: 1.5 }}>
            {tipo === 'senador' && (
              <>O <strong>Senado</strong> é eleito pelo sistema <strong>majoritário simples</strong>: em 2026 são renovadas 2/3 das cadeiras (54 no total), ou seja <strong>2 vagas por estado</strong> — eleitos os 2 candidatos mais votados. Não se aplica quociente.</>
            )}
            {tipo === 'governador' && (
              <>O <strong>governo estadual</strong> é eleição <strong>majoritária</strong>: vence quem tiver mais da metade dos votos válidos; havendo estado com mais de 200 mil eleitores e ninguém atingindo 50%+1, há <strong>2º turno</strong> entre os dois mais votados. Não se aplica quociente.</>
            )}
            {tipo === 'prefeito' && (
              <>A <strong>prefeitura</strong> é eleição majoritária. Não se aplica quociente eleitoral (esse cargo concorre nas eleições municipais — 2024/2028 — não em 2026).</>
            )}
            {tipo === 'presidente' && (
              <>A <strong>Presidência</strong> é eleição majoritária (2 turnos). Não se aplica quociente eleitoral.</>
            )}
          </p>
          <MajoritarioCalc tipo={tipo} ufInfo={ufInfo} card={card} labelStyle={labelStyle} />

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            Para esse cargo, o número relevante é o <strong>total de votos válidos</strong> e o limiar de maioria — não um coeficiente por vaga.
          </p>
        </div>
      ) : (
        <>
          <div style={card}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-gray)', margin: 0, lineHeight: 1.5 }}>
              Cargo <strong>proporcional</strong>: o <strong>Quociente Eleitoral (QE)</strong> é a quantidade de votos válidos
              dividida pelo número de vagas. Ele define quantos votos uma legenda/federação precisa somar para
              conquistar <strong>uma cadeira</strong>. Como o pleito de 2026 ocorre em outubro, os campos abaixo são uma
              <strong> projeção</strong> sobre o eleitorado — ajuste as premissas.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.9rem' }}>
            <div>
              <label style={labelStyle}>Eleitorado ({uf})</label>
              <input style={inputStyle} inputMode="numeric" value={eleitorado} onChange={(e) => setEleitorado(e.target.value)} placeholder="ex.: 1.200.000" />
            </div>
            <div>
              <label style={labelStyle}>Comparecimento (%)</label>
              <input style={inputStyle} inputMode="numeric" value={comparecimento} onChange={(e) => setComparecimento(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Votos válidos (%)</label>
              <input style={inputStyle} inputMode="numeric" value={pctValidos} onChange={(e) => setPctValidos(e.target.value)} />
            </div>
            {isDeputado ? (
              <>
                <div>
                  <label style={labelStyle}>Deputados federais do estado</label>
                  <input style={inputStyle} inputMode="numeric" value={depFederais} onChange={(e) => setDepFederais(e.target.value)} placeholder={uf === 'RO' ? 'RO: 8' : 'ver TSE'} />
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    {fedN > 0
                      ? `Vagas no cargo: ${vagasEfetivas} ${isDepEstadual ? '(estaduais, pela fórmula da CF art. 27)' : '(federais)'}`
                      : 'Informe a bancada federal do estado'}
                  </span>
                </div>
                <div>
                  <label style={labelStyle}>Federação política (opcional)</label>
                  <input style={inputStyle} type="text" value={federacaoLabel} onChange={(e) => setFederacaoLabel(e.target.value)} placeholder="ex: PRD-Solidariedade" />
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    Federação = partidos coligados nacionalmente. Para QE conta como 1 legenda única (soma de todos os votos).
                  </span>
                </div>
              </>
            ) : (
              <div>
                <label style={labelStyle}>Vagas (cadeiras)</label>
                <input style={inputStyle} inputMode="numeric" value={vagas} onChange={(e) => setVagas(e.target.value)} placeholder="ex.: nº de cadeiras" />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.9rem' }}>
            <div style={{ ...card, textAlign: 'center' }}>
              <span style={labelStyle}>Votos válidos projetados</span>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '4px 0 0', color: 'var(--text-white)' }}>{formatNumber(votosValidos)}</h3>
            </div>
            <div style={{ ...card, textAlign: 'center', borderColor: 'rgba(0,168,89,0.35)' }}>
              <span style={labelStyle}>Quociente eleitoral (1 cadeira)</span>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '4px 0 0', color: 'var(--accent-green-bright)' }}>
                {vagasEfetivas > 0 ? formatNumber(qe) : '—'}
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {vagasEfetivas > 0 ? `votos para eleger 1 nome` : 'informe o nº de vagas'}
              </span>
            </div>
            <div style={{ ...card, textAlign: 'center' }}>
              <span style={labelStyle}>Aptos ÷ cadeiras</span>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '4px 0 0', color: 'var(--accent-blue-bright)' }}>
                {vagasEfetivas > 0 && eN > 0 ? formatNumber(coefBruto) : '—'}
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {vagasEfetivas > 0 ? `referência bruta: ${formatNumber(eN)} aptos ÷ ${vagasEfetivas} cadeiras` : 'eleitorado ÷ vagas'}
              </span>
            </div>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
            Cálculo: <code>QE = votos válidos ÷ vagas</code> (despreza-se a fração ≤ 0,5; arredonda-se para 1 se &gt; 0,5).
            O <strong>quociente partidário</strong> de cada legenda = votos válidos da legenda ÷ QE.
            <strong> Votos válidos = nominais + de legenda</strong> (não inclui brancos nem nulos).
          </p>

          {vagasEfetivas > 0 && qe > 0 && (
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'0.9rem'}}>
              <div style={{ ...card, textAlign:'center', borderColor:'rgba(168,85,247,0.35)' }}>
                <span style={labelStyle}>Voto individual mínimo (10% QE)</span>
                <h3 style={{ fontSize:'1.4rem', fontWeight:800, margin:'4px 0 0', color:'#A855F7' }}>
                  {formatNumber(Math.ceil(qe*0.10))}
                </h3>
                <span style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>
                  Lei 13.165/15 art. 108 — voto individual mínimo p/ candidato eleito
                </span>
              </div>
              <div style={{ ...card, textAlign:'center', borderColor:'rgba(245,158,11,0.35)' }}>
                <span style={labelStyle}>Cláusula partidária (80% QE)</span>
                <h3 style={{ fontSize:'1.4rem', fontWeight:800, margin:'4px 0 0', color:'#F59E0B' }}>
                  {formatNumber(Math.ceil(qe*0.80))}
                </h3>
                <span style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>
                  Lei 9.504/97 art. 109 §2º — soma mínima da legenda p/ disputar sobras
                </span>
              </div>
              <div style={{ ...card, textAlign:'center', borderColor:'rgba(99,102,241,0.35)' }}>
                <span style={labelStyle}>Cadeiras restantes (sobras)</span>
                <h3 style={{ fontSize:'1.4rem', fontWeight:800, margin:'4px 0 0', color:'#6366F1' }}>
                  {formatNumber(vagasEfetivas - Math.floor(votosValidos / qe))}
                </h3>
                <span style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>
                  Vagas distribuídas em fases sucessivas pela maior média (CE art. 109)
                </span>
              </div>
            </div>
          )}

          {isDepFederal && (
            <div style={{ ...card, borderColor: 'rgba(245,158,11,0.3)' }}>
              <strong style={{ color: '#F59E0B', fontSize: '0.82rem' }}>⚠️ Bancada Federal 2026 em definição</strong>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-gray)', margin: '0.4rem 0 0', lineHeight: 1.5 }}>
                A bancada de Deputado Federal por estado está em revisão (projeto que amplia de 513 para 531
                e redistribuição pelo Censo 2022). <strong>Confirme a bancada do seu estado no portal do TSE</strong> antes
                de fechar o número. Código de cargo no TSE: Deputado Federal = 6.
              </p>
            </div>
          )}
          {isDepEstadual && (
            <div style={{ ...card, borderColor: 'rgba(99,102,241,0.3)' }}>
              <strong style={{ color: '#6366F1', fontSize: '0.82rem' }}>ℹ️ Como as {vagasEfetivas} vagas estaduais são calculadas</strong>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-gray)', margin: '0.4rem 0 0', lineHeight: 1.5 }}>
                Assembleia Legislativa segue a <strong>CF art. 27</strong>: 3× a bancada de Deputados Federais até alcançar 36;
                acima disso, +1 estadual por federal além de 12. Por isso pedimos a bancada federal — a estadual deriva.
                Código TSE: Deputado Estadual = 7.
              </p>
            </div>
          )}
          {federacaoLabel && qe > 0 && (
            <div style={{ ...card, borderColor: 'rgba(34,197,94,0.3)' }}>
              <strong style={{ color: 'var(--accent-green-bright)', fontSize: '0.82rem' }}>🤝 Cálculo pela federação {federacaoLabel}</strong>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-gray)', margin: '0.4rem 0 0', lineHeight: 1.5 }}>
                A federação <strong>{federacaoLabel}</strong> conta como UMA legenda no quociente partidário (Lei 14.208/2021).
                Para eleger <strong>1 candidato</strong>, a soma de votos da federação inteira (nominais + legenda de todos os
                partidos componentes) precisa atingir <strong>{formatNumber(qe)} votos</strong> (1× QE).
                Para disputar sobras na maior média, precisa <strong>{formatNumber(Math.ceil(qe*0.80))} votos</strong> (80% QE).
                Cada candidato individual ainda precisa cruzar o piso de <strong>{formatNumber(Math.ceil(qe*0.10))} votos</strong> (10% QE).
              </p>
            </div>
          )}
        </>
      )}

      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
        ⚖️ Base legal: Código Eleitoral (Lei 4.737/65), arts. 106-109, e regras do TSE para o sistema proporcional.
        Valores pré-eleitorais são <strong>estimativas</strong> — confirme eleitorado e nº de cadeiras no portal oficial do TSE/TRE.
      </p>
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

// =========================================================================
// MajoritarioCalc — projeção de votos válidos esperados para cargos
// majoritários (Senador, Governador, Presidente). Não há QE, mas o cálculo
// do universo de votos válidos é essencial para dimensionar campanha.
// =========================================================================
function MajoritarioCalc({ tipo, ufInfo, card, labelStyle }) {
  const eleitorado = ufInfo?.eleitorado || 0;
  if (!eleitorado) return null;
  // Defaults conservadores baseados em média BR 2022:
  const comparecimento = 0.79;
  const validos = 0.93;
  const compareceram = Math.round(eleitorado * comparecimento);
  const votosValidos = Math.round(compareceram * validos);
  // Limiar de maioria absoluta (2º turno): metade + 1
  const maioriaAbs = Math.ceil(votosValidos / 2) + 1;
  // Para Senador: votos do 2º colocado típico (referência histórica: ~30-40% do válidos)
  const ref2Sen = Math.round(votosValidos * 0.35);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.9rem', marginTop: '0.75rem' }}>
      <div style={{ ...card, textAlign: 'center' }}>
        <span style={labelStyle}>Eleitorado projetado 2026</span>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '4px 0 0', color: 'var(--text-white)' }}>{formatNumber(eleitorado)}</h3>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>base TSE (atualizar com cadastro 2026)</span>
      </div>
      <div style={{ ...card, textAlign: 'center' }}>
        <span style={labelStyle}>Comparecimento esperado</span>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '4px 0 0', color: 'var(--text-white)' }}>{formatNumber(compareceram)}</h3>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{Math.round(comparecimento*100)}% (média BR)</span>
      </div>
      <div style={{ ...card, textAlign: 'center' }}>
        <span style={labelStyle}>Votos válidos esperados</span>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '4px 0 0', color: 'var(--accent-green-bright)' }}>{formatNumber(votosValidos)}</h3>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{Math.round(validos*100)}% dos comparecentes</span>
      </div>
      {(tipo === 'governador' || tipo === 'presidente') && (
        <div style={{ ...card, textAlign: 'center', borderColor: 'rgba(245,158,11,0.35)' }}>
          <span style={labelStyle}>Limiar para vitória em 1º turno</span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '4px 0 0', color: '#F59E0B' }}>{formatNumber(maioriaAbs)}</h3>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>50%+1 dos votos válidos (CF art. 77)</span>
        </div>
      )}
      {tipo === 'senador' && (
        <div style={{ ...card, textAlign: 'center', borderColor: 'rgba(168,85,247,0.35)' }}>
          <span style={labelStyle}>Referência 2º colocado (ciclos anteriores)</span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '4px 0 0', color: '#A855F7' }}>~{formatNumber(ref2Sen)}</h3>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>~35% dos válidos = patamar competitivo p/ 2 vagas</span>
        </div>
      )}
    </div>
  );
}

