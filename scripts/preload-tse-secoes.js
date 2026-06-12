#!/usr/bin/env node
/**
 * scripts/preload-tse-secoes.js  (v2 — TSE Dados Abertos)
 *
 * Popula public.tse_secao_resultado com a distribuição de votos por ZONA
 * eleitoral de um município/cargo, a partir do dataset OFICIAL de votação
 * por seção do TSE Dados Abertos (CSV), agregando seção -> zona.
 *
 * POR QUE MUDOU (v1 estava quebrado):
 *   A v1 baixava `arquivo-urna/.../-aux.json`, que é só o MANIFESTO de hashes
 *   da urna (campos dg/hg/st/hashes) — NÃO o tally `carg/cand`. Logo gerava 0
 *   linhas. O tally por seção só existe nos boletins binários (.bu). A fonte
 *   correta e estável é o dataset `votacao_secao_{ano}_{UF}.zip` do TSE Dados
 *   Abertos, que traz QT_VOTOS por SQ_CANDIDATO por seção em CSV.
 *
 * Roda LOCAL (Mac/Linux) — usa `curl` e `unzip` do sistema. O download é
 * cacheado em $TMPDIR/epol_tse_cache (não rebaixa em re-execuções).
 *
 * Uso:
 *   export SUPABASE_SERVICE_ROLE_KEY="..."   # Supabase → Settings → API
 *   node scripts/preload-tse-secoes.js --uf=RO --city="PORTO VELHO" --role=Vereador --year=2024 --round=1
 *   # opcional: --dry-run  (valida e agrega, sem gravar)
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tlnprjkiydiogrcsruxw.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.split('=')).map(([k, v]) => [k.replace(/^--/, ''), v ?? true])
);
const DRY = !!args['dry-run'];
const year = parseInt(args.year || '2024', 10);
const round = parseInt(args.round || '1', 10);
const uf = (args.uf || 'RO').toString().toUpperCase();
const cityFilter = (args.city ? args.city.toString() : '').toUpperCase();
const roleFilter = args.role ? args.role.toString() : 'Vereador';
const roleCode = roleFilter.toLowerCase().includes('vereador') ? '13' : '11';

const ELECTION = { '2024-1': { id: '619', pleito: '452' }, '2024-2': { id: '620', pleito: '453' }, '2020-1': { id: '426', pleito: '406' } };
const cfg = ELECTION[`${year}-${round}`];

if (!SERVICE_KEY && !DRY) { console.error('❌ SUPABASE_SERVICE_ROLE_KEY não definida (use --dry-run para testar sem gravar).'); process.exit(1); }
if (!cfg) { console.error(`❌ ${year}-${round} não mapeado.`); process.exit(1); }
if (!cityFilter) { console.error('❌ --city obrigatório.'); process.exit(1); }

const CACHE = path.join(os.tmpdir(), 'epol_tse_cache');
fs.mkdirSync(CACHE, { recursive: true });

function parseCsvLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else { if (ch === '"') q = true; else if (ch === ';') { out.push(cur); cur = ''; } else cur += ch; }
  }
  out.push(cur); return out;
}

async function supa(method, pathname, body) {
  const res = await fetch(`${SUPABASE_URL}${pathname}`, {
    method,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res;
}

function ensureCsv() {
  const zip = path.join(CACHE, `votacao_secao_${year}_${uf}.zip`);
  const csv = path.join(CACHE, `votacao_secao_${year}_${uf}.csv`);
  if (!fs.existsSync(csv)) {
    if (!fs.existsSync(zip)) {
      const url = `https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_${year}_${uf}.zip`;
      console.log(`▶ baixando ${url}`);
      execSync(`curl -fsSL -A 'Mozilla/5.0' -o '${zip}' '${url}'`, { stdio: 'inherit' });
    }
    console.log('▶ extraindo CSV…');
    execSync(`unzip -o '${zip}' -d '${CACHE}'`, { stdio: 'ignore' });
  }
  return csv;
}

async function main() {
  console.log(`▶ Pré-carga SEÇÕES (Dados Abertos) — ${cityFilter}/${uf} ${roleFilter} ${year}T${round} (eleição ${cfg.id})`);

  // metadados dos candidatos (partido/nome/urna/mun_tse_code) a partir da apuração já carregada
  const meta = {}; let munCode = null;
  if (SERVICE_KEY) {
    const q = `/rest/v1/tse_apuracao?select=candidate_sq,party_abbr,candidate_urn_name,candidate_number,mun_tse_code,mun_name` +
      `&election_id=eq.${cfg.id}&role_code=eq.${roleCode}&mun_name=ilike.*${encodeURIComponent(cityFilter)}*&limit=5000`;
    const res = await supa('GET', q);
    for (const c of await res.json()) { meta[c.candidate_sq] = c; munCode = munCode || c.mun_tse_code; }
  }

  const csv = ensureCsv();
  const rl = readline.createInterface({ input: fs.createReadStream(csv, { encoding: 'latin1' }), crlfDelay: Infinity });
  let H = null; const perzona = new Map(); const csvmeta = new Map();
  for await (const line of rl) {
    const f = parseCsvLine(line);
    if (!H) { H = {}; f.forEach((c, i) => (H[c] = i)); continue; }
    if (!(f[H.NM_MUNICIPIO] || '').toUpperCase().includes(cityFilter)) continue;
    if (f[H.CD_CARGO] !== roleCode || f[H.NR_TURNO] !== String(round)) continue;
    const sq = f[H.SQ_CANDIDATO]; const zona = (f[H.NR_ZONA] || '').padStart(4, '0');
    const key = `${sq}|${zona}`;
    perzona.set(key, (perzona.get(key) || 0) + (parseInt(f[H.QT_VOTOS], 10) || 0));
    if (!csvmeta.has(sq)) csvmeta.set(sq, { nm: f[H.NM_VOTAVEL], nr: f[H.NR_VOTAVEL] });
  }
  munCode = munCode || '00000';

  const rows = [];
  for (const [key, votes] of perzona) {
    const [sq, zona] = key.split('|');
    const m = meta[sq] || {}; const cm = csvmeta.get(sq) || {};
    rows.push({
      election_year: year, election_id: cfg.id, pleito_id: cfg.pleito, uf: uf.toLowerCase(),
      mun_tse_code: m.mun_tse_code || munCode, mun_name: m.mun_name || cityFilter,
      electoral_zone: zona, electoral_section: '0000', polling_place: null,
      role_code: roleCode, candidate_sq: sq,
      candidate_urn_name: m.candidate_urn_name || cm.nm, candidate_number: m.candidate_number || cm.nr,
      party_abbr: m.party_abbr || null, votes,
      section_total_voters: null, section_total_present: null, section_blanks: null, section_nulls: null,
      raw_payload: { source: `tse_dados_abertos:votacao_secao_${year}_${uf}`, aggregated: 'zona' }
    });
  }
  console.log(`  candidatos: ${csvmeta.size} | linhas por zona: ${rows.length}`);
  if (DRY) { console.log('  (dry-run — nada gravado)'); return; }

  let ins = 0;
  for (let i = 0; i < rows.length; i += 500) { await supa('POST', '/rest/v1/tse_secao_resultado', rows.slice(i, i + 500)); ins += Math.min(500, rows.length - i); }
  console.log(`▶ Gravadas ${ins} linhas em tse_secao_resultado.`);
}

main().catch((e) => { console.error('❌ Erro fatal:', e.message); process.exit(1); });
