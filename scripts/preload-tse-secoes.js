#!/usr/bin/env node
/**
 * scripts/preload-tse-secoes.js
 *
 * Boletim de urna por seção. Roda LOCAL (Mac/Linux do operador) porque
 * resultados.tse.jus.br bloqueia IPs cloud.
 *
 * ATENÇÃO: volume potencialmente alto. Porto Velho tem 4 zonas × ~295
 * seções cada ≈ 1.180 seções × 2 cargos ≈ 2.360 requests. Use --city e
 * --role pra limitar.
 *
 * Uso:
 *   export SUPABASE_SERVICE_ROLE_KEY="..."
 *   node scripts/preload-tse-secoes.js --city="PORTO VELHO" --role=Vereador
 *
 * URL base do TSE:
 *   https://resultados.tse.jus.br/oficial/ele{YEAR}/arquivo-urna/{pleito}/
 *     dados/{uf}/{munCode}/{zona}/{secao}/p{pleito}-{uf}-m{munCode}-
 *     z{zona}-s{secao}-aux.json
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tlnprjkiydiogrcsruxw.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não definida.');
  process.exit(1);
}

const PLEITO_MAP = {
  '2024-1': { pleito: '452', election_id: '619' },
  '2024-2': { pleito: '453', election_id: '620' },
  '2020-1': { pleito: '406', election_id: '426' }
};

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  Referer: 'https://resultados.tse.jus.br/oficial/app/index.html'
};

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.split('=')).map(([k, v]) => [k.replace(/^--/, ''), v ?? true])
);

const year = parseInt(args.year || '2024', 10);
const round = parseInt(args.round || '1', 10);
const config = PLEITO_MAP[`${year}-${round}`];
if (!config) {
  console.error(`❌ ${year}-${round} não mapeado.`);
  process.exit(1);
}

const cityFilter = args.city ? args.city.toString().toUpperCase() : null;
const roleFilter = args.role ? args.role.toString() : null;
const sectionLimit = args.limit ? parseInt(args.limit, 10) : null; // pra testes

if (!cityFilter) {
  console.error('❌ --city obrigatório (preload completo é muito pesado).');
  process.exit(1);
}

// --------------------------------------------------------------------- API
async function fetchConfigSecoes(munCode) {
  // Config seções: lista zonas/seções/locais do município
  const url = `https://resultados.tse.jus.br/oficial/ele${year}/arquivo-urna/${config.pleito}/config/ro/ro-p${config.pleito.padStart(6, '0')}-cs.json`;
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  if (!res.ok) throw new Error(`Config seções TSE ${res.status}`);
  const data = await res.json();
  // Filtra apenas as zonas/seções do município escolhido
  const mun = (data.abr || []).flatMap((uf) => uf.mu || []).find((m) => m.cd === munCode);
  if (!mun) throw new Error(`Município ${munCode} sem zonas no config TSE`);
  const sections = [];
  for (const zona of mun.zon || []) {
    for (const sec of zona.sec || []) {
      sections.push({
        zona: zona.cd.padStart(4, '0'),
        secao: sec.ns.padStart(4, '0'),
        local: sec.lc?.no || ''
      });
    }
  }
  return sections;
}

async function fetchBoletim({ munCode, zona, secao }) {
  const url = `https://resultados.tse.jus.br/oficial/ele${year}/arquivo-urna/${config.pleito}/dados/ro/${munCode}/${zona}/${secao}/p${config.pleito.padStart(6, '0')}-ro-m${munCode}-z${zona}-s${secao}-aux.json`;
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  if (!res.ok) return null;
  return res.json();
}

function flattenBoletim(payload, ctx) {
  // payload.carg = [{cd, cand: [{sqcand, vap, ...}]}, ...]
  // payload.e = {te (eleitorado), c (comparecimento), bn (br/nulos)}
  const rows = [];
  const roleCodeFilter = ctx.roleCode;
  for (const carg of payload?.carg || []) {
    if (roleCodeFilter && String(carg.cd) !== roleCodeFilter) continue;
    for (const cand of carg.cand || []) {
      rows.push({
        election_year: ctx.year,
        election_id: ctx.election_id,
        pleito_id: ctx.pleito,
        uf: 'ro',
        mun_tse_code: ctx.munCode,
        mun_name: ctx.munName,
        electoral_zone: ctx.zona,
        electoral_section: ctx.secao,
        polling_place: ctx.local || null,
        role_code: String(carg.cd),
        candidate_sq: String(cand.sqcand),
        candidate_urn_name: cand.nmu || null,
        candidate_number: String(cand.n || ''),
        party_abbr: cand.pa || null,
        votes: parseInt(cand.vap, 10) || 0,
        section_total_voters: parseInt(payload?.e?.te, 10) || null,
        section_total_present: parseInt(payload?.e?.c, 10) || null,
        section_blanks: parseInt(payload?.tb, 10) || null,
        section_nulls: parseInt(payload?.tn, 10) || null,
        raw_payload: null, // economizar storage; raw fica só em apuracao
        fetched_at: new Date().toISOString()
      });
    }
  }
  return rows;
}

async function saveBatch(rows) {
  if (rows.length === 0) return { ok: true, inserted: 0 };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tse_secao_resultado`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(rows)
  });
  if (!res.ok) return { ok: false, status: res.status, body: await res.text() };
  return { ok: true, inserted: rows.length };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------- main
async function main() {
  // Buscar municipio code via tse_apuracao
  const params = new URLSearchParams({
    select: 'mun_tse_code,mun_name',
    election_id: `eq.${config.election_id}`,
    mun_name: `ilike.${cityFilter}%`,
    limit: '1'
  });
  const munRes = await fetch(`${SUPABASE_URL}/rest/v1/tse_apuracao?${params}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
  });
  const munData = await munRes.json();
  if (!munData.length) {
    console.error(`❌ Município "${cityFilter}" não encontrado em tse_apuracao. Rode preload-tse-apuracao primeiro.`);
    process.exit(1);
  }
  const { mun_tse_code: munCode, mun_name: munName } = munData[0];

  console.log(`▶ Pré-carga SEÇÕES — ${munName} (${munCode}) · ${year}T${round}`);
  if (roleFilter) console.log(`  cargo: ${roleFilter}`);

  console.log('\n▶ Buscando config de seções TSE...');
  let sections = await fetchConfigSecoes(munCode);
  console.log(`  ${sections.length} seções totais no município`);
  if (sectionLimit) {
    sections = sections.slice(0, sectionLimit);
    console.log(`  limitado a ${sections.length} seções (--limit)`);
  }

  const roleCodeFilter = roleFilter
    ? roleFilter.toLowerCase().includes('vereador')
      ? '13'
      : '11'
    : null;

  console.log('\n▶ Buscando boletins (~5 req/s)...');
  let processadas = 0;
  let linhasInseridas = 0;
  let erros = 0;
  const startedAt = Date.now();
  const batch = [];

  for (const sec of sections) {
    processadas++;
    try {
      const payload = await fetchBoletim({ munCode, zona: sec.zona, secao: sec.secao });
      if (payload) {
        const rows = flattenBoletim(payload, {
          year,
          election_id: config.election_id,
          pleito: config.pleito,
          munCode,
          munName,
          zona: sec.zona,
          secao: sec.secao,
          local: sec.local,
          roleCode: roleCodeFilter
        });
        batch.push(...rows);
      }
      if (processadas % 50 === 0) {
        process.stdout.write(`  [${processadas}/${sections.length}] ${linhasInseridas} linhas\r`);
      }
      if (batch.length >= 200) {
        const r = await saveBatch(batch.splice(0));
        if (r.ok) linhasInseridas += r.inserted;
        else {
          erros++;
          console.warn(`\n  ⚠ flush ${r.status}: ${r.body?.slice(0, 100)}`);
        }
      }
      await sleep(200);
    } catch (e) {
      erros++;
      console.warn(`\n  ✗ z${sec.zona}/s${sec.secao}: ${e.message}`);
    }
  }

  if (batch.length > 0) {
    const r = await saveBatch(batch);
    if (r.ok) linhasInseridas += r.inserted;
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n\n▶ Finalizado em ${elapsed}s`);
  console.log(`  seções: ${processadas} | linhas: ${linhasInseridas} | erros: ${erros}`);
}

main().catch((e) => {
  console.error('❌ Erro fatal:', e);
  process.exit(1);
});
