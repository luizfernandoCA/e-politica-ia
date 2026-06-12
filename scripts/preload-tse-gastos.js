#!/usr/bin/env node
/**
 * scripts/preload-tse-gastos.js  (v2 — TSE Dados Abertos)
 *
 * Popula public.tse_gastos com a prestação de contas (receitas + despesas)
 * de um município/cargo, a partir dos datasets OFICIAIS do TSE Dados Abertos.
 *
 * POR QUE MUDOU (v1 estava quebrado):
 *   A v1 chamava `divulgacandcontas.../prestador/consulta/.../90/90/{sq}`, que
 *   responde HTTP 200 com corpo VAZIO (a API mudou / é protegida) → has_data=false
 *   pra todo mundo. A fonte estável é o pacote `prestacao_de_contas_eleitorais_
 *   candidatos_{ano}.zip` do TSE Dados Abertos (CSVs por UF: receitas + despesas).
 *
 * Roda LOCAL (Mac/Linux) — usa `curl` e `unzip`. ATENÇÃO: o ZIP é NACIONAL e
 * grande (~1.2 GB); é cacheado em $TMPDIR/epol_tse_cache e só extrai os CSVs da
 * UF pedida. Em re-execuções não rebaixa.
 *
 * Uso:
 *   export SUPABASE_SERVICE_ROLE_KEY="..."
 *   node scripts/preload-tse-gastos.js --uf=RO --city="PORTO VELHO" --role=Vereador --year=2024
 *   # opcional: --dry-run
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

const ELECTION = { '2024-1': { id: '619', sq: '2045202024' }, '2024-2': { id: '620', sq: '2045202024' }, '2020-1': { id: '426', sq: '2030402020' } };
const cfg = ELECTION[`${year}-${round}`];

if (!SERVICE_KEY) { console.error('❌ SUPABASE_SERVICE_ROLE_KEY não definida.'); process.exit(1); }
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
function brl(v) {
  if (v == null) return 0;
  const s = String(v).trim();
  if (['', '#NULO#', '#NE#', '-1', '-'].includes(s)) return 0;
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
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
function ensureUfCsv(kind) {
  // kind: 'receitas_candidatos' | 'despesas_contratadas_candidatos'
  const csv = path.join(CACHE, `${kind}_${year}_${uf}.csv`);
  if (fs.existsSync(csv)) return csv;
  const zip = path.join(CACHE, `prestacao_de_contas_eleitorais_candidatos_${year}.zip`);
  if (!fs.existsSync(zip)) {
    const url = `https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_${year}.zip`;
    console.log(`▶ baixando prestação de contas (NACIONAL, ~1.2GB) — ${url}`);
    execSync(`curl -fsSL -A 'Mozilla/5.0' -o '${zip}' '${url}'`, { stdio: 'inherit' });
  }
  console.log(`▶ extraindo ${kind}_${year}_${uf}.csv …`);
  execSync(`unzip -o '${zip}' '${kind}_${year}_${uf}.csv' -d '${CACHE}'`, { stdio: 'ignore' });
  return csv;
}
async function sumBySq(csvPath, valCol, sqset) {
  const rl = readline.createInterface({ input: fs.createReadStream(csvPath, { encoding: 'latin1' }), crlfDelay: Infinity });
  let H = null; const tot = new Map();
  for await (const line of rl) {
    const f = parseCsvLine(line);
    if (!H) { H = {}; f.forEach((c, i) => (H[c] = i)); continue; }
    const sq = f[H.SQ_CANDIDATO];
    if (sqset.has(sq)) tot.set(sq, (tot.get(sq) || 0) + brl(f[H[valCol]]));
  }
  return tot;
}

async function main() {
  console.log(`▶ Pré-carga GASTOS (Dados Abertos) — ${cityFilter}/${uf} ${roleFilter} ${year} (eleição ${cfg.id})`);
  const q = `/rest/v1/tse_apuracao?select=candidate_sq,candidate_votes,party_abbr,candidate_urn_name,candidate_name,candidate_number,mun_tse_code,mun_name` +
    `&election_id=eq.${cfg.id}&role_code=eq.${roleCode}&mun_name=ilike.*${encodeURIComponent(cityFilter)}*&limit=5000`;
  const cands = {}; for (const c of await (await supa('GET', q)).json()) cands[c.candidate_sq] = c;
  const sqset = new Set(Object.keys(cands));
  console.log(`  candidatos (${cityFilter}/${roleFilter}): ${sqset.size}`);
  if (!sqset.size) { console.error('❌ Nenhum candidato em tse_apuracao — rode preload-tse-apuracao primeiro.'); process.exit(1); }

  const receita = await sumBySq(ensureUfCsv('receitas_candidatos'), 'VR_RECEITA', sqset);
  const despesa = await sumBySq(ensureUfCsv('despesas_contratadas_candidatos'), 'VR_DESPESA_CONTRATADA', sqset);
  console.log(`  com receita: ${receita.size} | com despesa: ${despesa.size}`);

  const rows = Object.values(cands).map((c) => {
    const sq = c.candidate_sq; const tr = receita.get(sq); const td = despesa.get(sq);
    const votes = c.candidate_votes || 0; const has = !!(tr || td);
    return {
      election_year: year, election_id: cfg.id, sq_eleicao: cfg.sq, uf: uf.toLowerCase(),
      mun_tse_code: c.mun_tse_code, mun_name: c.mun_name, role_code: roleCode, role_name: roleFilter,
      candidate_sq: sq, candidate_urn_name: c.candidate_urn_name, candidate_name: c.candidate_name,
      candidate_number: c.candidate_number, party_abbr: c.party_abbr,
      has_data: has, prestacao_status: has ? 'TSE Dados Abertos (prestação ' + year + ')' : 'Sem prestação localizada',
      total_receita: tr != null ? Math.round(tr * 100) / 100 : null,
      total_despesa: td != null ? Math.round(td * 100) / 100 : null,
      limite_legal: null,
      custo_por_voto: td && votes > 0 ? Math.round((td / votes) * 100) / 100 : null,
      taxa_uso_limite: null,
      raw_payload: { source: `tse_dados_abertos:receitas+despesas_contratadas_${year}_${uf}` }
    };
  });
  console.log(`  linhas: ${rows.length} | com prestação: ${rows.filter((r) => r.has_data).length}`);
  if (DRY) { console.log('  (dry-run — nada gravado)'); return; }

  let ins = 0;
  for (let i = 0; i < rows.length; i += 200) { await supa('POST', '/rest/v1/tse_gastos', rows.slice(i, i + 200)); ins += Math.min(200, rows.length - i); }
  console.log(`▶ Gravadas ${ins} linhas em tse_gastos.`);
}

main().catch((e) => { console.error('❌ Erro fatal:', e.message); process.exit(1); });
