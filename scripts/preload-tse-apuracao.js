#!/usr/bin/env node
/**
 * scripts/preload-tse-apuracao.js
 *
 * Job de pré-carga executado LOCALMENTE (Mac/Linux do operador) que
 * baixa a apuração oficial do TSE para os 52 municípios de Rondônia
 * e popula `public.tse_apuracao` no Supabase via service_role.
 *
 * Por que rodar local:
 *   O endpoint `resultados.tse.jus.br/oficial/.../...-u.json` responde 403
 *   quando consultado de IPs de cloud (Vercel, AWS), provavelmente como
 *   proteção contra scraping. Do seu Mac (IP residencial), funciona.
 *   Depois de populado, o endpoint /api/tse-apuracao serve só do cache.
 *
 * Como rodar:
 *   export SUPABASE_SERVICE_ROLE_KEY="..."   # do Supabase Dashboard → Settings → API
 *   node scripts/preload-tse-apuracao.js --year=2024 --round=1 --role=Vereador
 *
 *   # Todos os cargos e turnos de 2024:
 *   node scripts/preload-tse-apuracao.js --year=2024
 *
 *   # Limitar a 1 município (debug):
 *   node scripts/preload-tse-apuracao.js --year=2024 --city="PORTO VELHO"
 *
 * Rate limit:
 *   TSE permite ~100 req/s/IP. Aqui usamos 5 req/s para sermos polidos
 *   e evitar bloqueio acidental.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tlnprjkiydiogrcsruxw.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não definida.');
  console.error('   Pegue em https://supabase.com/dashboard/project/tlnprjkiydiogrcsruxw/settings/api');
  console.error('   E rode: export SUPABASE_SERVICE_ROLE_KEY="..."');
  process.exit(1);
}

const ELECTION_CODES = {
  '2024-1': '619',
  '2024-2': '620',
  '2020-1': '426',
  '2020-2': '427'
};

const RO_MUNICIPALITIES = {
  "ALTA FLORESTA D'OESTE": "00310",
  "ALTO ALEGRE DOS PARECIS": "00736",
  "ALTO PARAÍSO": "00639",
  "ALVORADA DO OESTE": "00337",
  "ARIQUEMES": "00078",
  "BURITIS": "00779",
  "CABIXI": "00450",
  "CACAULÂNDIA": "00620",
  "CACOAL": "00094",
  "CAMPO NOVO DE RONDÔNIA": "00671",
  "CANDEIAS DO JAMARI": "00477",
  "CASTANHEIRAS": "00531",
  "CEREJEIRAS": "00272",
  "CHUPINGUAIA": "00809",
  "COLORADO DO OESTE": "00230",
  "CORUMBIARA": "00655",
  "COSTA MARQUES": "00213",
  "CUJUBIM": "00680",
  "ESPIGÃO DO OESTE": "00256",
  "GOVERNADOR JORGE TEIXEIRA": "00612",
  "GUAJARÁ-MIRIM": "00019",
  "ITAPUÃ DO OESTE": "00493",
  "JARU": "00159",
  "JI-PARANÁ": "00051",
  "MACHADINHO D'OESTE": "00396",
  "MINISTRO ANDREAZZA": "00604",
  "MIRANTE DA SERRA": "00574",
  "MONTE NEGRO": "00663",
  "NOVA BRASILÂNDIA D'OESTE": "00370",
  "NOVA MAMORÉ": "00434",
  "NOVA UNIÃO": "00744",
  "NOVO HORIZONTE DO OESTE": "00515",
  "OURO PRETO DO OESTE": "00175",
  "PARECIS": "00701",
  "PIMENTA BUENO": "00116",
  "PIMENTEIRAS DO OESTE": "00787",
  "PORTO VELHO": "00035",
  "PRESIDENTE MÉDICI": "00191",
  "PRIMAVERA DE RONDÔNIA": "00728",
  "RIO CRESPO": "00647",
  "ROLIM DE MOURA": "00299",
  "SANTA LUZIA D'OESTE": "00353",
  "SÃO FELIPE D'OESTE": "00710",
  "SÃO FRANCISCO DO GUAPORÉ": "00795",
  "SÃO MIGUEL DO GUAPORÉ": "00418",
  "SERINGUEIRAS": "00582",
  "TEIXEIRÓPOLIS": "00752",
  "THEOBROMA": "00590",
  "URUPÁ": "00566",
  "VALE DO ANARI": "00698",
  "VALE DO PARAÍSO": "00558",
  "VILHENA": "00132"
};

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
  'Referer': 'https://resultados.tse.jus.br/oficial/app/index.html',
  'Origin': 'https://resultados.tse.jus.br'
};

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((a) => a.split('='))
    .map(([k, v]) => [k.replace(/^--/, ''), v ?? true])
);

const year = parseInt(args.year || '2024', 10);
const round = parseInt(args.round || '1', 10);
const roleArg = args.role || 'all';
const cityFilter = args.city ? args.city.toString().toUpperCase() : null;
const electionId = ELECTION_CODES[`${year}-${round}`];
if (!electionId) {
  console.error(`❌ Ano/turno ${year}-${round} não suportado.`);
  process.exit(1);
}

const roles =
  roleArg === 'all'
    ? [{ code: '11', name: 'Prefeito' }, { code: '13', name: 'Vereador' }]
    : [{ code: roleArg === 'Vereador' ? '13' : '11', name: roleArg }];

// --- utilitários TSE ---
function parseTseNumber(s) {
  if (s == null || s === '') return null;
  const n = parseInt(String(s).replace(/[.,]/g, ''), 10);
  return Number.isNaN(n) ? null : n;
}
function parseTsePercent(s) {
  if (s == null || s === '') return null;
  const n = parseFloat(String(s).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}
function parseTseDate(brDate) {
  if (!brDate || !brDate.includes('/')) return null;
  const [d, m, y] = brDate.split('/');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

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

  const partyToFederation = {};
  for (const fed of carg.fed || []) {
    for (const partyNum of fed.npar || []) {
      partyToFederation[partyNum] = { id: fed.n, abbr: fed.sg, name: fed.nm };
    }
  }

  const rows = [];
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
        rows.push({
          election_year: queryYear,
          election_id: electionId,
          election_round: electionRound,
          election_date: parseTseDate(tseData?.dt),
          uf: 'ro',
          mun_tse_code: munCode,
          mun_name: munName,
          role_code: roleCode,
          role_name: roleName,
          role_total_seats: parseTseNumber(carg.nv),
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
          ...partyAggregate,
          ...electionAggregate,
          raw_payload: { source: 'preload', sqcand: cand.sqcand },
          fetched_at: new Date().toISOString()
        });
      }
    }
  }
  return rows;
}

async function fetchTse({ munCode, roleCode }) {
  const url =
    `https://resultados.tse.jus.br/oficial/ele${year}/${electionId}` +
    `/dados/ro/ro${munCode}-c${roleCode.padStart(4, '0')}` +
    `-e${electionId.padStart(6, '0')}-u.json`;
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  if (!res.ok) {
    throw new Error(`TSE ${res.status} ${url}`);
  }
  return res.json();
}

async function saveBatch(rows) {
  if (rows.length === 0) return { ok: true, inserted: 0 };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tse_apuracao`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(rows)
  });
  if (!res.ok) {
    const body = await res.text();
    return { ok: false, status: res.status, body };
  }
  return { ok: true, inserted: rows.length };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`▶ Pré-carga TSE — ano ${year} turno ${round} eleição ${electionId}`);
  console.log(`  cargos: ${roles.map((r) => r.name).join(', ')}`);
  const targets = Object.entries(RO_MUNICIPALITIES).filter(
    ([name]) => !cityFilter || name.toUpperCase() === cityFilter
  );
  console.log(`  municípios: ${targets.length}\n`);

  let totalRows = 0;
  let totalReqs = 0;
  let errors = 0;
  const startedAt = Date.now();

  for (const [munName, munCode] of targets) {
    for (const role of roles) {
      totalReqs++;
      try {
        const tseData = await fetchTse({ munCode, roleCode: role.code });
        const rows = flattenTsePayload({
          tseData,
          queryYear: year,
          electionId,
          munCode,
          munName,
          roleCode: role.code,
          roleName: role.name,
          electionRound: round
        });
        const result = await saveBatch(rows);
        if (result.ok) {
          totalRows += result.inserted;
          process.stdout.write(`  ✓ ${munName.padEnd(36)} ${role.name.padEnd(10)} ${String(result.inserted).padStart(4)} linhas\n`);
        } else {
          errors++;
          process.stdout.write(`  ✗ ${munName.padEnd(36)} ${role.name.padEnd(10)} SAVE ${result.status}\n`);
        }
      } catch (e) {
        errors++;
        process.stdout.write(`  ✗ ${munName.padEnd(36)} ${role.name.padEnd(10)} ${e.message}\n`);
      }
      // Polidez: 5 req/s = 200ms entre cada
      await sleep(200);
    }
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n▶ Finalizado em ${elapsed}s`);
  console.log(`  requests: ${totalReqs}, linhas inseridas: ${totalRows}, erros: ${errors}`);
}

main().catch((e) => {
  console.error('❌ Erro fatal:', e);
  process.exit(1);
});
