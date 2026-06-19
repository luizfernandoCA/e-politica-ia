/**
 * Vercel Serverless Function: api/tse-apuracao.js
 *
 * Apuração oficial desagregada do TSE para um município/cargo/ano.
 * Consome o endpoint público do TSE de divulgação de resultados:
 *
 *   https://resultados.tse.jus.br/oficial/ele{YEAR}/{ELECTION}/dados/{UF}/
 *     {UF}{TSE_CODE}-c{CARGO}-e{ELECTION}-u.json
 *
 * Retorna o panorama que o Politique mobile exibe (Coligação, Desempenho,
 * Votação geral): votos absolutos por candidato, agregados de partido,
 * apuração das seções, eleitorado/comparecimento.
 *
 * Diferente de api/tse.js (que só lista candidatos do DivulgaCandContas),
 * esta função entrega o boletim com `votes` REAIS por candidato + os
 * agregados que permitem montar Coligação/Desempenho/Votação na UI.
 *
 * Cache:
 *   - Persiste em public.tse_apuracao (uma linha por candidato).
 *   - TTL: 1 dia para dados não-finalizados; permanente para finalizados (and:'f').
 *
 * Limite TSE:
 *   - 100 req/IP/s. 404 múltiplos podem bloquear o IP por 10min.
 *
 * Query params:
 *   ?city=PORTO%20VELHO            (obrigatório, case-insensitive)
 *   &role=Prefeito|Vereador        (default Prefeito)
 *   &year=2024|2020                (default 2024)
 *   &round=1|2                     (default 1)
 *   &force=1                       (ignora cache; útil em apuração ao vivo)
 */

// Códigos de eleição (cd_eleicao no config TSE). Para descobrir novos códigos:
//   curl https://resultados.tse.jus.br/oficial/comum/config/ele-c.json
const ELECTION_CODES = {
  '2024-1': '619',
  '2024-2': '620',
  '2020-1': '426',
  '2020-2': '427'
};

// Mapeamento RO 52 municípios (replicado de api/tse.js — mantemos a mesma
// fonte de verdade). Se diverger, atualizar ambos.
const RO_MUNICIPALITIES = {
  "ALTA FLORESTA D'OESTE": "00310", "ALTA FLORESTA DO OESTE": "00310",
  "ALTO ALEGRE DOS PARECIS": "00736", "ALTO PARAISO": "00639", "ALTO PARAÍSO": "00639",
  "ALVORADA DO OESTE": "00337", "ARIQUEMES": "00078", "BURITIS": "00779",
  "CABIXI": "00450", "CACAULANDIA": "00620", "CACAULÂNDIA": "00620",
  "CACOAL": "00094", "CAMPO NOVO DE RONDONIA": "00671", "CAMPO NOVO DE RONDÔNIA": "00671",
  "CANDEIAS DO JAMARI": "00477", "CASTANHEIRAS": "00531", "CEREJEIRAS": "00272",
  "CHUPINGUAIA": "00809", "COLORADO DO OESTE": "00230", "CORUMBIARA": "00655",
  "COSTA MARQUES": "00213", "CUJUBIM": "00680", "ESPIGAO DO OESTE": "00256",
  "ESPIGÃO DO OESTE": "00256", "GOVERNADOR JORGE TEIXEIRA": "00612",
  "GUAJARA-MIRIM": "00019", "GUAJARÁ-MIRIM": "00019", "ITAPUA DO OESTE": "00493",
  "ITAPUÃ DO OESTE": "00493", "JARU": "00159", "JI-PARANA": "00051", "JI-PARANÁ": "00051",
  "MACHADINHO D'OESTE": "00396", "MINISTRO ANDREAZZA": "00604",
  "MIRANTE DA SERRA": "00574", "MONTE NEGRO": "00663",
  "NOVA BRASILANDIA D'OESTE": "00370", "NOVA BRASILÂNDIA D'OESTE": "00370",
  "NOVA MAMORE": "00434", "NOVA MAMORÉ": "00434", "NOVA UNIAO": "00744",
  "NOVA UNIÃO": "00744", "NOVO HORIZONTE DO OESTE": "00515",
  "OURO PRETO DO OESTE": "00175", "PARECIS": "00701", "PIMENTA BUENO": "00116",
  "PIMENTEIRAS DO OESTE": "00787", "PORTO VELHO": "00035",
  "PRESIDENTE MEDICI": "00191", "PRESIDENTE MÉDICI": "00191",
  "PRIMAVERA DE RONDONIA": "00728", "PRIMAVERA DE RONDÔNIA": "00728",
  "RIO CRESPO": "00647", "ROLIM DE MOURA": "00299", "SANTA LUZIA D'OESTE": "00353",
  "SÃO FELIPE D'OESTE": "00710", "SÃO FRANCISCO DO GUAPORE": "00795",
  "SÃO FRANCISCO DO GUAPORÉ": "00795", "SÃO MIGUEL DO GUAPORE": "00418",
  "SÃO MIGUEL DO GUAPORÉ": "00418", "SERINGUEIRAS": "00582",
  "TEIXEIRÓPOLIS": "00752", "THEOBROMA": "00590", "URUPA": "00566", "URUPÁ": "00566",
  "VALE DO ANARI": "00698", "VALE DO PARAISO": "00558", "VALE DO PARAÍSO": "00558",
  "VILHENA": "00132"
};

function normalizeString(str) {
  return str ? str.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim() : '';
}

function parseTseNumber(str) {
  if (str === undefined || str === null || str === '') return null;
  const n = parseInt(String(str).replace(/[.,]/g, ''), 10);
  return Number.isNaN(n) ? null : n;
}

function parseTsePercent(str) {
  if (str === undefined || str === null || str === '') return null;
  const n = parseFloat(String(str).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

function parseTseDate(brDate) {
  // dd/mm/yyyy → yyyy-mm-dd
  if (!brDate || !brDate.includes('/')) return null;
  const [d, m, y] = brDate.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || 'https://tlnprjkiydiogrcsruxw.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, serviceKey };
}

// ---------------------------------------------------------------------
// Cache em public.tse_apuracao
// ---------------------------------------------------------------------
const CACHE_TTL_FINALIZED_MS = 365 * 24 * 60 * 60 * 1000; // 1 ano (dados finais não mudam)
const CACHE_TTL_LIVE_MS = 60 * 1000;                      // 1 min (apuração ao vivo)

async function fetchFromCache({ electionId, munCode, roleCode }) {
  const { url, serviceKey } = getSupabaseConfig();
  if (!serviceKey) return null;

  const params = new URLSearchParams({
    election_id: `eq.${electionId}`,
    mun_tse_code: `eq.${munCode}`,
    role_code: `eq.${roleCode}`,
    select: '*',
    order: 'candidate_seq.asc.nullslast'
  });

  const res = await fetch(`${url}/rest/v1/tse_apuracao?${params.toString()}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json'
    }
  });
  if (!res.ok) return null;
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;

  return rows;
}

async function saveToCache(records) {
  const { url, serviceKey } = getSupabaseConfig();
  if (!serviceKey || records.length === 0) return false;

  const res = await fetch(`${url}/rest/v1/tse_apuracao`, {
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
    console.warn('[tse_apuracao cache] save failed:', res.status, errBody);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------
// Normaliza JSON do TSE em linhas prontas para o cache.
// Uma linha por candidato; agregados (eleição, município, partido) são
// repetidos em cada linha para facilitar consulta via PostgREST (sem JOIN).
// ---------------------------------------------------------------------
function flattenTsePayload({ tseData, queryYear, electionId, munCode, munName, roleCode, roleName, electionRound }) {
  const carg = (tseData.carg || []).find((c) => String(c.cd) === roleCode);
  if (!carg) return [];

  const electionAggregate = {
    total_voters: parseTseNumber(tseData?.e?.te),
    total_present: parseTseNumber(tseData?.e?.c),
    pct_present: parseTsePercent(tseData?.e?.pc),
    sections_total: parseTseNumber(tseData?.s?.ts),
    sections_counted: parseTseNumber(tseData?.s?.st),
    pct_sections_counted: parseTsePercent(tseData?.s?.pst)
  };

  // Map partido → federação (se houver)
  const partyToFederation = {};
  for (const fed of carg.fed || []) {
    for (const partyNum of fed.npar || []) {
      partyToFederation[partyNum] = { id: fed.n, abbr: fed.sg, name: fed.nm };
    }
  }

  // Ranking calculado pela lista achatada
  const candidatesFlat = [];
  for (const agr of carg.agr || []) {
    const partiesIter = Array.isArray(agr.par) ? agr.par : [];
    for (const party of partiesIter) {
      const fed = partyToFederation[party.n] || {};
      const partyAggregate = {
        party_number: String(party.n),
        party_abbr: party.sg || party.com || '',
        party_name: party.nm || party.sg || '',
        party_total_nominal_votes: parseTseNumber(party.tvtn),
        party_total_legend_votes: parseTseNumber(party.tvtl),
        party_total_valid_votes: parseTseNumber(party.tval ?? party.tvan),
        party_seats_elected: parseTseNumber(agr.vag),
        federation_id: fed.id || null,
        federation_abbr: fed.abbr || null,
        federation_name: fed.name || null
      };

      for (const cand of party.cand || []) {
        candidatesFlat.push({
          // Identificação eleição/local/cargo
          election_year: queryYear,
          election_id: electionId,
          election_round: electionRound,
          election_name: null,
          election_date: parseTseDate(tseData?.dt),
          uf: 'ro',
          mun_tse_code: munCode,
          mun_ibge_code: null,
          mun_name: munName,
          role_code: roleCode,
          role_name: roleName || carg.nmn || null,
          role_total_seats: parseTseNumber(carg.nv),

          // Candidato
          candidate_seq: parseTseNumber(cand.seq),
          candidate_sq: String(cand.sqcand),
          candidate_name: cand.nm || cand.nmu || '',
          candidate_urn_name: cand.nmu || cand.nm || '',
          candidate_number: String(cand.n || ''),
          candidate_birth_date: parseTseDate(cand.dt),
          candidate_validity: cand.dvt || null,
          candidate_is_elected: String(cand.e || 'n').toLowerCase() === 's',
          candidate_outcome: cand.st || null,
          candidate_votes: parseTseNumber(cand.vap) || 0,
          candidate_percentage: parseTsePercent(cand.pvapn || cand.pvap),

          // Partido / Federação
          ...partyAggregate,

          // Agregados eleição
          ...electionAggregate,

          // Raw para futuras evoluções
          raw_payload: { source: 'resultados.tse.jus.br', fetched_for: cand.sqcand },

          fetched_at: new Date().toISOString()
        });
      }
    }
  }

  return candidatesFlat;
}

// =====================================================================
// HANDLER
// =====================================================================
import { applyCors } from '../lib/guard.js';

export default async function handler(req, res) {
  if (applyCors(req, res, { methods: 'GET,OPTIONS' })) return;

  const { city, role = 'Prefeito', year = '2024', round = '1', force } = req.query;
  if (!city) {
    return res.status(400).json({ success: false, error: 'Parâmetro `city` é obrigatório.' });
  }

  const munCode = RO_MUNICIPALITIES[normalizeString(city)];
  if (!munCode) {
    return res.status(400).json({
      success: false,
      error: `Município '${city}' não encontrado na lista de Rondônia.`
    });
  }

  const queryYear = parseInt(year, 10);
  const electionRound = parseInt(round, 10);
  const electionId = ELECTION_CODES[`${queryYear}-${electionRound}`];
  if (!electionId) {
    return res.status(400).json({
      success: false,
      error: `Ano/turno '${year}-${round}' não suportado. Adicione em ELECTION_CODES.`
    });
  }

  const roleCode = role === 'Vereador' ? '13' : '11';
  const roleName = role === 'Vereador' ? 'Vereador' : 'Prefeito';

  // ---------------------------------------------------------------------
  // 1. Cache lookup
  // ---------------------------------------------------------------------
  if (!force) {
    const cached = await fetchFromCache({ electionId, munCode, roleCode });
    if (cached && cached.length > 0) {
      const cacheAgeMs = Date.now() - new Date(cached[0].fetched_at).getTime();
      const isFinalized = cached[0].pct_sections_counted >= 100;
      const ttl = isFinalized ? CACHE_TTL_FINALIZED_MS : CACHE_TTL_LIVE_MS;
      if (cacheAgeMs < ttl) {
        return res.status(200).json({
          success: true,
          cached: true,
          lastFetchedAt: cached[0].fetched_at,
          source: 'resultados.tse.jus.br (via cache)',
          electionId,
          municipality: { code: munCode, name: cached[0].mun_name },
          role: { code: roleCode, name: roleName, seats: cached[0].role_total_seats },
          aggregate: {
            totalVoters: cached[0].total_voters,
            totalPresent: cached[0].total_present,
            pctPresent: cached[0].pct_present,
            sectionsTotal: cached[0].sections_total,
            sectionsCounted: cached[0].sections_counted,
            pctSectionsCounted: cached[0].pct_sections_counted
          },
          candidates: cached
        });
      }
    }
  }

  // ---------------------------------------------------------------------
  // 2. Fetch ao TSE
  // ---------------------------------------------------------------------
  const ufLower = 'ro';
  const tseUrl =
    `https://resultados.tse.jus.br/oficial/ele${queryYear}/${electionId}` +
    `/dados/${ufLower}/${ufLower}${munCode}-c${roleCode.padStart(4, '0')}` +
    `-e${electionId.padStart(6, '0')}-u.json`;

  let tseData;
  try {
    // TSE bloqueia (403) requisições com User-Agent suspeito (default do
    // Node fetch). Enviar UA + Accept + Referer realistas resolve.
    const tseRes = await fetch(tseUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Referer': 'https://resultados.tse.jus.br/oficial/app/index.html',
        'Origin': 'https://resultados.tse.jus.br'
      }
    });
    if (!tseRes.ok) {
      console.error(`[TSE Apuração] ${tseRes.status} em ${tseUrl}`);
      return res.status(502).json({
        success: false,
        error: `A apuração oficial do TSE retornou status ${tseRes.status}. Tente novamente.`
      });
    }
    tseData = await tseRes.json();
  } catch (err) {
    console.error('[TSE Apuração] Falha de rede:', err?.message);
    return res.status(502).json({
      success: false,
      error: 'Falha de rede ao consultar a apuração oficial do TSE.'
    });
  }

  // ---------------------------------------------------------------------
  // 3. Normalizar + persistir
  // ---------------------------------------------------------------------
  const records = flattenTsePayload({
    tseData,
    queryYear,
    electionId,
    munCode,
    munName: city.toUpperCase(),
    roleCode,
    roleName,
    electionRound
  });

  // Fire-and-forget; não bloqueia a resposta.
  saveToCache(records).catch((err) =>
    console.warn('[tse_apuracao] async save error:', err.message)
  );

  return res.status(200).json({
    success: true,
    cached: false,
    lastFetchedAt: new Date().toISOString(),
    source: 'resultados.tse.jus.br (live)',
    electionId,
    municipality: { code: munCode, name: city.toUpperCase() },
    role: {
      code: roleCode,
      name: roleName,
      seats: parseTseNumber(tseData?.carg?.[0]?.nv)
    },
    aggregate: {
      totalVoters: parseTseNumber(tseData?.e?.te),
      totalPresent: parseTseNumber(tseData?.e?.c),
      pctPresent: parseTsePercent(tseData?.e?.pc),
      sectionsTotal: parseTseNumber(tseData?.s?.ts),
      sectionsCounted: parseTseNumber(tseData?.s?.st),
      pctSectionsCounted: parseTsePercent(tseData?.s?.pst)
    },
    candidates: records
  });
}
