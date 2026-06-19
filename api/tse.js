/**
 * Vercel Serverless Function: api/tse.js
 * Proxy function to fetch official municipal election candidates from TSE DivulgaCandContas
 * bypassing CORS, specifically designed for Rondônia's 52 municipalities.
 */

import { applyCors } from '../lib/guard.js';

// Comprehensive Rondônia 52 Municipalities to 5-digit TSE Code mapping
const RO_MUNICIPALITIES = {
  "ALTA FLORESTA D'OESTE": "00310",
  "ALTA FLORESTA DO ESTE": "00310",
  "ALTO ALEGRE DOS PARECIS": "00736",
  "ALTO PARAISO": "00639",
  "ALTO PARAÍSO": "00639",
  "ALVORADA DO OESTE": "00337",
  "ALVORADA DO ESTE": "00337",
  "ARIQUEMES": "00078",
  "BURITIS": "00779",
  "CABIXI": "00450",
  "CACAULANDIA": "00620",
  "CACAULÂNDIA": "00620",
  "CACOAL": "00094",
  "CAMPO NOVO DE RONDONIA": "00671",
  "CAMPO NOVO DE RONDÔNIA": "00671",
  "CANDEIAS DO JAMARI": "00477",
  "CASTANHEIRAS": "00531",
  "CEREJEIRAS": "00272",
  "CHUPINGUAIA": "00809",
  "COLORADO DO OESTE": "00230",
  "CORUMBIARA": "00655",
  "COSTA MARQUES": "00213",
  "CUJUBIM": "00680",
  "ESPIGAO DO OESTE": "00256",
  "ESPIGÃO DO OESTE": "00256",
  "GOVERNADOR JORGE TEIXEIRA": "00612",
  "GUAJARA-MIRIM": "00019",
  "GUAJARÁ-MIRIM": "00019",
  "ITAPUA DO OESTE": "00493",
  "ITAPUÃ DO OESTE": "00493",
  "JARU": "00159",
  "JI-PARANA": "00051",
  "JI-PARANÁ": "00051",
  "MACHADINHO D'OESTE": "00396",
  "MACHADINHO DO ESTE": "00396",
  "MINISTRO ANDREAZZA": "00604",
  "MIRANTE DA SERRA": "00574",
  "MONTE NEGRO": "00663",
  "NOVA BRASILANDIA D'OESTE": "00370",
  "NOVA BRASILÂNDIA D'OESTE": "00370",
  "NOVA MAMORE": "00434",
  "NOVA MAMORÉ": "00434",
  "NOVA UNIAO": "00744",
  "NOVA UNIÃO": "00744",
  "NOVO HORIZONTE DO OESTE": "00515",
  "NOVO HORIZONTE DO ESTE": "00515",
  "OURO PRETO DO OESTE": "00175",
  "PARECIS": "00701",
  "PIMENTA BUENO": "00116",
  "PIMENTEIRAS DO OESTE": "00787",
  "PORTO VELHO": "00035",
  "PRESIDENTE MEDICI": "00191",
  "PRESIDENTE MÉDICI": "00191",
  "PRIMAVERA DE RONDONIA": "00728",
  "PRIMAVERA DE RONDÔNIA": "00728",
  "RIO CRESPO": "00647",
  "ROLIM DE MOURA": "00299",
  "SANTA LUZIA D'OESTE": "00353",
  "SANTA LUZIA DO ESTE": "00353",
  "SÃO FELIPE D'OESTE": "00710",
  "SÃO FELIPE DO ESTE": "00710",
  "SÃO FRANCISCO DO GUAPORE": "00795",
  "SÃO FRANCISCO DO GUAPORÉ": "00795",
  "SÃO MIGUEL DO GUAPORE": "00418",
  "SÃO MIGUEL DO GUAPORÉ": "00418",
  "SERINGUEIRAS": "00582",
  "TEIXEIRÓPOLIS": "00752",
  "THEOBROMA": "00590",
  "URUPA": "00566",
  "URUPÁ": "00566",
  "VALE DO ANARI": "00698",
  "VALE DO PARAISO": "00558",
  "VALE DO PARAÍSO": "00558",
  "VILHENA": "00132"
};

// Election IDs for Rondônia in DivulgaCand REST API
const ELECTION_CODES = {
  2024: "2045202024", // 2024 Municipais RO
  2020: "2030402020"  // 2020 Municipais RO
};

// Cache TTL: dados de eleição passada não mudam, mas mantemos refresh
// quinzenal para captar correções pontuais do TSE em diplomações tardias.
const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 dias

// -----------------------------------------------------------------------
// Cache TSE persistente (public.tse_votes_cache).
// Escreve via service_role (bypass RLS); lê via PostgREST.
// -----------------------------------------------------------------------
function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || 'https://tlnprjkiydiogrcsruxw.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, serviceKey };
}

async function fetchFromCache({ electionYear, munCode, roleCode }) {
  const { url, serviceKey } = getSupabaseConfig();
  if (!serviceKey) return null;

  const params = new URLSearchParams({
    election_year: `eq.${electionYear}`,
    mun_tse_code: `eq.${munCode}`,
    role_code: `eq.${roleCode}`,
    select: 'candidate_tse_id,candidate_name,party,number,outcome,is_winner,votes,percentage,fetched_at',
    order: 'is_winner.desc,candidate_name.asc'
  });

  const res = await fetch(`${url}/rest/v1/tse_votes_cache?${params.toString()}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) return null;
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const newest = rows.reduce(
    (acc, r) => (!acc || new Date(r.fetched_at) > new Date(acc) ? r.fetched_at : acc),
    null
  );

  if (newest && Date.now() - new Date(newest).getTime() > CACHE_TTL_MS) {
    return null;
  }

  return { rows, lastFetchedAt: newest };
}

async function saveToCache({ electionYear, munCode, munName, roleCode, candidates, rawPayload }) {
  const { url, serviceKey } = getSupabaseConfig();
  if (!serviceKey) return false;

  const records = candidates.map((c) => ({
    election_year: electionYear,
    mun_tse_code: munCode,
    mun_name: munName,
    role_code: roleCode,
    candidate_tse_id: c.id,
    candidate_name: c.name,
    party: c.party,
    number: c.number ?? null,
    outcome: c.outcome,
    is_winner: c.isWinner,
    // Apuração desagregada (votes/percentage) ainda não vem do
    // DivulgaCandContas; fica NULL até integrarmos o boletim de urna.
    votes: null,
    percentage: null,
    raw_payload: rawPayload ?? null,
    fetched_at: new Date().toISOString()
  }));

  const res = await fetch(`${url}/rest/v1/tse_votes_cache`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(records)
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.warn('[tse cache] save failed:', res.status, errBody);
    return false;
  }
  return true;
}

function normalizeString(str) {
  return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim() : "";
}

function getPartyColor(party) {
  const p = party.toUpperCase();
  if (p === 'PL') return 'var(--accent-blue)';
  if (p === 'PT' || p === 'PC DO B' || p === 'PV') return 'rgba(239, 68, 68, 0.85)';
  if (p === 'PSD') return 'var(--accent-green)';
  if (p === 'MDB') return 'rgba(16, 185, 129, 0.85)';
  if (p === 'UNIÃO' || p === 'UNIAO') return 'var(--accent-blue-bright)';
  if (p === 'PP') return 'rgba(59, 130, 246, 0.85)';
  if (p === 'REPUBLICANOS') return 'rgba(217, 119, 6, 0.85)';
  return 'var(--accent-yellow)';
}

export default async function handler(req, res) {
  if (applyCors(req, res, { methods: 'GET,OPTIONS' })) return;

  const { city, year, role } = req.query;

  if (!city || !year) {
    return res.status(400).json({ error: 'Missing parameters. Provide city and year.' });
  }

  const normCity = normalizeString(city);
  const munCode = RO_MUNICIPALITIES[normCity];

  if (!munCode) {
    return res.status(400).json({ 
      error: `Município '${city}' não encontrado na lista oficial de 52 cidades de Rondônia.` 
    });
  }

  const queryYear = parseInt(year);
  const electCode = ELECTION_CODES[queryYear];

  if (!electCode) {
    return res.status(400).json({ 
      error: `Ano eleitoral '${year}' não suportado. Escolha entre 2020 e 2024.` 
    });
  }

  const cargoCode = role === 'Vereador' ? '13' : '11'; // Prefeito = 11, Vereador = 13
  const targetUrl = `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/listar/${queryYear}/${munCode}/${electCode}/${cargoCode}/candidatos`;

  // ---------------------------------------------------------------------
  // 1. Cache lookup: se houver linha válida em tse_votes_cache (≤14 dias),
  //    serve imediatamente. Reduz latência (~50ms vs ~1.5s no TSE) e
  //    elimina dependência de uptime do DivulgaCandContas.
  // ---------------------------------------------------------------------
  try {
    const cached = await fetchFromCache({
      electionYear: queryYear,
      munCode,
      roleCode: cargoCode
    });

    if (cached) {
      const candidates = cached.rows.map((row) => ({
        id: row.candidate_tse_id,
        name: row.candidate_name,
        fullName: row.candidate_name,
        party: row.party,
        number: row.number,
        status: '—',
        outcome: row.outcome ?? 'Não informado',
        isWinner: row.is_winner,
        avatar: '👤',
        color: getPartyColor(row.party)
      }));

      return res.status(200).json({
        success: true,
        cached: true,
        lastFetchedAt: cached.lastFetchedAt,
        city: city.toUpperCase(),
        tseCode: munCode,
        electionYear: queryYear,
        roleName: role || (cargoCode === '13' ? 'Vereador' : 'Prefeito'),
        candidatesSource: 'TSE DivulgaCandContas (oficial, via cache)',
        candidates,
        // Apuração desagregada ainda não vem do DivulgaCandContas.
        // Quando o boletim de urna for integrado, votes/percentage virão
        // diretamente do cache (preenchidos pelo job de ingestão).
        voteDistribution: cached.rows.map((row) => ({
          candidateId: row.candidate_tse_id,
          name: row.candidate_name,
          party: row.party,
          number: row.number,
          votes: row.votes,
          percentage: row.percentage,
          color: getPartyColor(row.party),
          outcome: row.outcome,
          isWinner: row.is_winner
        })),
        voteDistributionKind: cached.rows.some((r) => r.votes !== null) ? 'official' : 'pending',
        disclaimer:
          'Lista e desfecho (Eleito/Não Eleito) oficiais do TSE. ' +
          'A apuração desagregada por seção (votos absolutos) ainda não está ' +
          'disponível neste cache; integração com boletim de urna na Fase ' +
          'seguinte do roadmap.'
      });
    }
  } catch (cacheErr) {
    console.warn('[tse cache] lookup failed, proceeding to live TSE fetch:', cacheErr.message);
  }

  // ---------------------------------------------------------------------
  // 2. Cache miss → busca direto no TSE.
  // ---------------------------------------------------------------------
  try {
    const fetchResponse = await fetch(targetUrl);
    
    if (!fetchResponse.ok) {
      throw new Error(`TSE Server returned status ${fetchResponse.status}`);
    }

    const data = await fetchResponse.json();
    const rawCandidates = data.candidatos || [];

    // Formulate a structured and clean representation
    let candidates = rawCandidates.map(c => {
      const isWinner = c.descricaoTotalizacao === 'Eleito' || c.descricaoTotalizacao === 'Eleito por QP' || c.descricaoTotalizacao === 'Eleito por média';
      return {
        id: c.id.toString(),
        name: c.nomeUrna.toUpperCase(),
        fullName: c.nomeCompleto,
        party: c.partido.sigla,
        number: c.numero,
        status: c.descricaoSituacao,
        outcome: c.descricaoTotalizacao || 'Não informado',
        isWinner: isWinner,
        avatar: c.descricaoSexo === 'FEMININO' ? '👩‍💼' : '👨‍💼',
        color: getPartyColor(c.partido.sigla)
      };
    });

    // Sort candidates: Winner first, then alphabetically
    candidates.sort((a, b) => {
      if (a.isWinner && !b.isWinner) return -1;
      if (!a.isWinner && b.isWinner) return 1;
      return a.name.localeCompare(b.name);
    });

    // -----------------------------------------------------------------------
    // Persistir no cache em paralelo, sem bloquear a resposta ao usuário.
    // Falhas são logadas mas não propagadas (cache é melhoria, não req).
    // -----------------------------------------------------------------------
    const persistedAt = new Date().toISOString();
    saveToCache({
      electionYear: queryYear,
      munCode,
      munName: data.unidadeEleitoral?.nome || city.toUpperCase(),
      roleCode: cargoCode,
      candidates,
      rawPayload: { totalRaw: rawCandidates.length }
    }).catch((err) => console.warn('[tse cache] async save error:', err.message));

    // -----------------------------------------------------------------------
    // ATENÇÃO: distribuição de votos abaixo é ESTIMATIVA PROPORCIONAL
    // determinística, não o resultado oficial. A API DivulgaCandContas usada
    // acima retorna a LISTA de candidatos e o desfecho ("Eleito" / não eleito),
    // mas não a apuração desagregada. Para resultados oficiais por seção,
    // a Fase D introduz cache real em `public.tse_votes_cache` consumindo
    // o endpoint de apuração do TSE.
    //
    // Esta estimativa serve apenas como visualização ilustrativa do panorama
    // eleitoral histórico (vencedor vs. demais), nunca como número oficial.
    // -----------------------------------------------------------------------
    const estimatedElectoratePerMun = {
      "00035": 380000, // Porto Velho
      "00051": 95000,  // Ji-Paraná
      "00078": 78000,  // Ariquemes
      "00132": 65000,  // Vilhena
      "00094": 62000,  // Cacoal
    };
    const estimatedTotalVotes = estimatedElectoratePerMun[munCode] || 25000;
    const isVereador = cargoCode === '13';

    // Distribuição determinística (sem Math.random). Fórmula:
    //   - Vereador: vencedor 1.35% decrescendo 0.08% por posição; não-eleitos
    //     começam em 0.45% decrescendo 0.03% por posição (mínimo 0.15%).
    //   - Prefeito: percentuais fixos por tamanho do pool (1, 2 ou 3+).
    const voteDistribution = [];
    let remainingPercentage = 100.0;

    candidates.forEach((c, idx) => {
      let pct;
      if (isVereador) {
        if (c.isWinner) {
          pct = Math.max(0.15, 1.35 - (idx * 0.08));
        } else {
          pct = Math.max(0.15, 0.45 - (idx * 0.03));
        }
      } else if (c.isWinner) {
        pct = candidates.length === 1 ? 100.0 : (candidates.length === 2 ? 54.5 : 42.8);
      } else if (idx === 1) {
        pct = candidates.length === 2 ? 45.5 : 34.2;
      } else {
        pct = Math.max(2.5, remainingPercentage / Math.max(1, candidates.length - idx));
      }

      pct = parseFloat(pct.toFixed(2));

      if (!isVereador) {
        if (idx === candidates.length - 1) {
          pct = parseFloat(Math.max(0, remainingPercentage).toFixed(2));
        }
        remainingPercentage -= pct;
      }

      voteDistribution.push({
        candidateId: c.id,
        name: c.name,
        party: c.party,
        number: c.number,
        estimatedVotes: Math.round((estimatedTotalVotes * pct) / 100),
        estimatedPercentage: pct,
        color: c.color,
        outcome: c.outcome,
        isWinner: c.isWinner,
        // Compatibilidade temporária com componentes legados que leem `votes`/`percentage`.
        // A UI deve ler `estimatedVotes` e exibir o rótulo "Estimativa".
        votes: Math.round((estimatedTotalVotes * pct) / 100),
        percentage: pct
      });
    });

    return res.status(200).json({
      success: true,
      cached: false,
      lastFetchedAt: persistedAt,
      city: data.unidadeEleitoral?.nome || city.toUpperCase(),
      tseCode: munCode,
      electionYear: queryYear,
      roleName: data.cargo?.nome || role,
      // Fonte oficial: lista de candidatos e desfecho ("Eleito").
      candidatesSource: 'TSE DivulgaCandContas (oficial, live)',
      candidates: candidates,
      // Estimativa proporcional — NÃO é apuração oficial.
      voteDistribution: voteDistribution,
      voteDistributionKind: 'estimate',
      estimatedTotalVotes,
      disclaimer:
        'A lista e o desfecho (Eleito/Não Eleito) vêm do TSE. ' +
        'A distribuição de votos é uma ESTIMATIVA PROPORCIONAL determinística, ' +
        'não a apuração oficial por seção. Para apuração desagregada, ' +
        'consulte o boletim de urna oficial em divulga.tse.jus.br.',
      // Mantido temporariamente para compatibilidade com componentes legados.
      totalVotes: estimatedTotalVotes
    });

  } catch (error) {
    console.error(`[API TSE PROXY ERROR]:`, error);
    return res.status(502).json({
      success: false,
      error: 'Falha ao consultar a base oficial do TSE. Tente novamente em instantes.'
    });
  }
}
