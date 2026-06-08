#!/usr/bin/env node
/**
 * scripts/preload-tse-gastos.js
 *
 * Para cada candidato em public.tse_apuracao, busca a prestação de contas
 * no DivulgaCandContas do TSE e popula public.tse_gastos. Roda LOCAL
 * (Mac/Linux do operador) porque o TSE bloqueia (403) IPs cloud.
 *
 * Uso:
 *   export SUPABASE_SERVICE_ROLE_KEY="..."
 *   node scripts/preload-tse-gastos.js --year=2024 --round=1
 *
 * Opcionais:
 *   --city="PORTO VELHO"    # só esse município
 *   --role=Vereador         # Prefeito|Vereador (default ambos)
 *   --limit=20              # primeiros N candidatos (debug)
 *
 * Rate limit: 5 req/s pra ser polido com o TSE.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tlnprjkiydiogrcsruxw.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não definida.');
  process.exit(1);
}

const SQ_ELEICAO_MAP = {
  '2024-1': { sq: '2045202024', id: '619' },
  '2024-2': { sq: '2045202024', id: '620' },
  '2020-1': { sq: '2030402020', id: '426' }
};

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9',
  Referer: 'https://divulgacandcontas.tse.jus.br/divulga/'
};

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.split('=')).map(([k, v]) => [k.replace(/^--/, ''), v ?? true])
);

const year = parseInt(args.year || '2024', 10);
const round = parseInt(args.round || '1', 10);
const eleicao = SQ_ELEICAO_MAP[`${year}-${round}`];
if (!eleicao) {
  console.error(`❌ Ano/turno ${year}-${round} não mapeado.`);
  process.exit(1);
}

const cityFilter = args.city ? args.city.toString().toUpperCase() : null;
const roleFilter = args.role ? args.role.toString() : null;
const candidateLimit = args.limit ? parseInt(args.limit, 10) : null;

// ----------------------------------------------------------------------- API
async function fetchApuracaoCandidates() {
  const params = new URLSearchParams({
    select: 'candidate_sq,candidate_name,candidate_urn_name,candidate_number,party_abbr,role_code,role_name,mun_tse_code,mun_name,candidate_votes',
    election_id: `eq.${eleicao.id}`,
    order: 'mun_name.asc,role_code.asc,candidate_seq.asc'
  });
  if (cityFilter) params.set('mun_name', `ilike.%${cityFilter}%`);
  if (roleFilter) {
    const code = roleFilter.toLowerCase().includes('vereador') ? '13' : '11';
    params.set('role_code', `eq.${code}`);
  }
  if (candidateLimit) params.set('limit', String(candidateLimit));

  const res = await fetch(`${SUPABASE_URL}/rest/v1/tse_apuracao?${params.toString()}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchPrestacao({ munCode, roleCode, sqcand }) {
  const url = `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/prestador/consulta/${eleicao.sq}/${year}/${munCode}/${roleCode}/90/90/${sqcand}`;
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  if (!res.ok) return { __status: res.status };
  const text = await res.text();
  if (!text || text.trim() === '') return { __empty: true };
  try {
    return JSON.parse(text);
  } catch {
    return { __unparseable: text.slice(0, 200) };
  }
}

function num(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  // TSE usa vírgula decimal: "1.234,56"
  const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

function normalizePrestacao(raw, ctx) {
  // O JSON do DivulgaCandContas tem campos como:
  // totalReceita, totalDespesas, totalRecursosProprios, limiteGastos, etc.
  // Como a estrutura varia entre versões, extraímos defensivamente.
  if (!raw || raw.__empty || raw.__status || raw.__unparseable) {
    return {
      ...ctx,
      has_data: false,
      raw_payload: raw || null,
      prestacao_status: raw?.__status ? `HTTP ${raw.__status}` : 'sem dados',
      fetched_at: new Date().toISOString()
    };
  }

  const total_receita = num(raw.totalReceita ?? raw.totalReceitas);
  const total_despesa = num(raw.totalDespesas ?? raw.totalDespesa);
  const limite = num(raw.limiteGastosCargo ?? raw.limiteGastos);
  const votos = ctx.candidate_votes ?? 0;

  return {
    ...ctx,
    has_data: true,
    prestacao_status: raw.dsSituacaoPrestacao || raw.situacaoEnvio || 'Recebida',
    total_receita,
    total_despesa,
    total_receita_estimavel: num(raw.totalReceitaEstimavel),
    total_doacoes_proprio: num(raw.totalRecursoProprio ?? raw.totalDoacoesProprio),
    total_doacoes_outros: num(raw.totalDoacoesOutros),
    total_outros_recursos: num(raw.totalOutrosRecursos),
    saldo_caixa: num(raw.saldoCaixa),
    limite_legal: limite,
    custo_por_voto: total_despesa && votos > 0 ? total_despesa / votos : null,
    taxa_uso_limite: total_despesa && limite ? (total_despesa / limite) * 100 : null,
    raw_payload: raw,
    fetched_at: new Date().toISOString()
  };
}

async function saveBatch(rows) {
  if (rows.length === 0) return { ok: true, inserted: 0 };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tse_gastos`, {
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`▶ Pré-carga GASTOS — ano ${year} turno ${round} eleição ${eleicao.id}`);
  if (cityFilter) console.log(`  cidade: ${cityFilter}`);
  if (roleFilter) console.log(`  cargo: ${roleFilter}`);

  const cands = await fetchApuracaoCandidates();
  console.log(`  candidatos a processar: ${cands.length}\n`);

  let comDados = 0;
  let semDados = 0;
  let erros = 0;
  const startedAt = Date.now();
  const batch = [];

  for (let i = 0; i < cands.length; i++) {
    const c = cands[i];
    try {
      const raw = await fetchPrestacao({
        munCode: c.mun_tse_code,
        roleCode: c.role_code,
        sqcand: c.candidate_sq
      });
      const ctx = {
        election_year: year,
        election_id: eleicao.id,
        sq_eleicao: eleicao.sq,
        uf: 'ro',
        mun_tse_code: c.mun_tse_code,
        mun_name: c.mun_name,
        role_code: c.role_code,
        role_name: c.role_name,
        candidate_sq: c.candidate_sq,
        candidate_urn_name: c.candidate_urn_name,
        candidate_name: c.candidate_name,
        candidate_number: c.candidate_number,
        party_abbr: c.party_abbr,
        candidate_votes: c.candidate_votes
      };
      const row = normalizePrestacao(raw, ctx);
      // Remove campos que não estão na tabela
      delete row.candidate_votes;
      batch.push(row);
      if (row.has_data) comDados++;
      else semDados++;

      if ((i + 1) % 10 === 0) {
        process.stdout.write(`  [${i + 1}/${cands.length}] processados (${comDados} com dados)\r`);
      }

      // Flush a cada 50 linhas
      if (batch.length >= 50) {
        const r = await saveBatch(batch.splice(0));
        if (!r.ok) {
          console.warn(`\n  ⚠ flush falhou: ${r.status} ${r.body?.slice(0, 100)}`);
          erros++;
        }
      }

      await sleep(200); // 5 req/s
    } catch (e) {
      erros++;
      console.warn(`\n  ✗ ${c.candidate_urn_name}: ${e.message}`);
    }
  }

  // Flush final
  if (batch.length > 0) {
    const r = await saveBatch(batch);
    if (!r.ok) {
      console.warn(`\n  ⚠ flush final falhou: ${r.status} ${r.body?.slice(0, 100)}`);
      erros++;
    }
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n\n▶ Finalizado em ${elapsed}s`);
  console.log(`  total: ${cands.length} | com prestação: ${comDados} | sem dados: ${semDados} | erros: ${erros}`);
}

main().catch((e) => {
  console.error('❌ Erro fatal:', e);
  process.exit(1);
});
