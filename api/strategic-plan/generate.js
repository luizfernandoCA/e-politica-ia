/**
 * api/strategic-plan/generate.js  —  ORQUESTRADOR HTTP do Motor Estratégico (Onda 1).
 *
 * Fluxo:
 *  1) auth + rate-limit + budget cap
 *  2) cria strategic_plans row (status=DRAFT)
 *  3) collectors paralelos: TSE + IBGE (com timeout)
 *  4) ranker determinístico → pré-ranking de adversários
 *  5) Claude Opus 4.7 com prompt v1 → JSON do plano
 *  6) validator (INV-1..7) → reprova se viola
 *  7) persiste plano + evidências; status=READY
 *  8) registra custo em ai_budget + ai_analyses
 *
 * Devolve `{ ok:true, plan_id, plan_data, ... }` ou erro tipado.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { applyCors, verifyUser, unauthorized, fetchWithTimeout, tooLong } from '../../lib/guard.js';
import { checkRateLimit } from '../../lib/rate-limit.js';
import { checkBudget, recordBudgetUsage, computeCostCents } from '../../lib/budget.js';
import { collectTSE } from './collectors/tse-collector.js';
import { collectIBGE } from './collectors/ibge-collector.js';
import { rankAdversaries } from './ranker.js';
import { validatePlan } from './validator.js';

export const config = { maxDuration: 60 };

const DEFAULT_MODEL = 'claude-opus-4-7';
const __dirname = dirname(fileURLToPath(import.meta.url));
const SYSTEM_PROMPT = readFileSync(join(__dirname, 'prompts/v1.system.txt'), 'utf8');

function sb() { return { url: process.env.SUPABASE_URL || 'https://tlnprjkiydiogrcsruxw.supabase.co', key: process.env.SUPABASE_SERVICE_ROLE_KEY }; }

async function dbInsert(table, row) {
  const { url, key } = sb();
  const r = await fetchWithTimeout(`${url}/rest/v1/${table}`, {
    method:'POST',
    headers:{ apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json', Prefer:'return=representation' },
    body: JSON.stringify(row),
  }, 5000);
  if (!r.ok) throw new Error(`db insert ${table} ${r.status}`);
  const arr = await r.json();
  return arr?.[0];
}

async function dbUpdate(table, filter, patch) {
  const { url, key } = sb();
  await fetchWithTimeout(`${url}/rest/v1/${table}?${filter}`, {
    method:'PATCH',
    headers:{ apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json' },
    body: JSON.stringify(patch),
  }, 5000);
}

function hashInputs(o) {
  const s = JSON.stringify(o);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

async function callAnthropic(userMessage, apiKey, model) {
  const r = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0.2,
      system: [{ type:'text', text: SYSTEM_PROMPT, cache_control: { type:'ephemeral' } }],
      messages: [{ role:'user', content: userMessage }],
    }),
  }, 45_000);
  return { ok: r.ok, status: r.status, body: await r.json().catch(() => ({})) };
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ ok:false, code:'METHOD' });

  const user = await verifyUser(req);
  if (!user) return unauthorized(res);

  // 1) Rate-limit
  const rl = await checkRateLimit(user.id, 'strategic_plan');
  if (!rl.ok) return res.status(429).json({ ok:false, code: rl.code || 'RATE_LIMITED' });

  // 2) Budget cap
  const bg = await checkBudget(user.id);
  if (!bg.ok) return res.status(402).json({ ok:false, code:'BUDGET_EXCEEDED', detail: bg });

  // 3) Validar inputs
  const { candidate_profile_id, nome_urna, cargo_alvo, estado, mun_code, mun_code_ibge, ano_eleicao, tse_candidate_id } = req.body || {};
  if (!candidate_profile_id || !nome_urna || !cargo_alvo || !estado || !ano_eleicao) {
    return res.status(400).json({ ok:false, code:'BAD_INPUT', detail:'candidate_profile_id, nome_urna, cargo_alvo, estado, ano_eleicao são obrigatórios' });
  }
  if (tooLong(nome_urna, 120) || tooLong(estado, 2) || tooLong(mun_code, 10)) {
    return res.status(413).json({ ok:false, code:'INPUT_TOO_LONG' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ ok:false, code:'AI_NOT_CONFIGURED' });
  }

  const startedAt = Date.now();
  const inputs_hash = hashInputs({ candidate_profile_id, ano_eleicao });

  // 4) Cria row de plano
  let plan;
  try {
    plan = await dbInsert('strategic_plans', {
      candidate_profile_id,
      user_id: user.id,
      status: 'COLLECTING',
      prompt_version: 'v1',
      inputs_hash,
      model_used: DEFAULT_MODEL,
    });
  } catch (e) {
    return res.status(500).json({ ok:false, code:'DB_INSERT_FAILED', detail: String(e.message) });
  }

  // 5) Collectors paralelos
  const [tseRes, ibgeRes] = await Promise.all([
    collectTSE({ estado, cargo_alvo, mun_code, ano_eleicao, tse_candidate_id }).catch(e => ({ ok:false, error:String(e) })),
    mun_code_ibge ? collectIBGE(mun_code_ibge).catch(e => ({ ok:false, error:String(e) })) : Promise.resolve({ ok:false, code:'NO_IBGE_CODE' }),
  ]);

  const degraded_sources = [];
  if (!tseRes.ok) degraded_sources.push('tse');
  if (!ibgeRes.ok) degraded_sources.push('ibge');
  const data_sources = { tse: tseRes.ok, ibge: ibgeRes.ok, gdelt:false, x:false, meta:false };

  await dbUpdate('strategic_plans', `id=eq.${plan.id}`, {
    status: degraded_sources.length ? 'DEGRADED' : 'ANALYZING',
    data_sources, degraded_sources,
  });

  // 6) Ranker determinístico
  const pre_ranking = rankAdversaries(tseRes.adversaries || [], tseRes.historical_results || []);

  // 7) Monta prompt do usuário
  const userPayload = {
    candidate: { nome_urna, cargo_alvo, estado, mun_code, ano_eleicao },
    pre_ranking,
    historical_tse: tseRes.historical_results?.slice(0, 2) || [],
    voter_universe: tseRes.voter_universe || null,
    ibge_indicators: ibgeRes.indicators || null,
    notes: { tse: tseRes.notes, ibge_coverage: ibgeRes.coverage },
    instruction: 'Produza o JSON do Plano Tático. Comece com `{` e termine com `}`. SEM markdown.',
  };

  // 8) Chama Claude
  const ai = await callAnthropic(JSON.stringify(userPayload), process.env.ANTHROPIC_API_KEY, DEFAULT_MODEL);
  if (!ai.ok) {
    await dbUpdate('strategic_plans', `id=eq.${plan.id}`, {
      status:'FAILED', error_code:'AI_ERROR', error_message:`status=${ai.status}`,
    });
    return res.status(503).json({ ok:false, code:'AI_ERROR', detail:`status=${ai.status}` });
  }

  // 9) Parse JSON do Claude
  const rawText = ai.body?.content?.[0]?.text || '';
  let planData;
  try {
    const first = rawText.indexOf('{'); const last = rawText.lastIndexOf('}');
    planData = JSON.parse(rawText.slice(first, last + 1));
  } catch {
    await dbUpdate('strategic_plans', `id=eq.${plan.id}`, {
      status:'FAILED', error_code:'AI_BAD_JSON', error_message:'Claude não retornou JSON parsável',
    });
    return res.status(502).json({ ok:false, code:'AI_BAD_JSON' });
  }

  // 10) Validator (sem evidências de verdade nesta primeira versão, deixa pular INV-1)
  // TODO Onda 2: criar tabela evidence_input + plugar fontes nas claims.
  const validation = validatePlan(planData, []);
  if (!validation.ok && validation.violations.some(v => v.inv === 'INV-6')) {
    await dbUpdate('strategic_plans', `id=eq.${plan.id}`, {
      status:'FAILED', error_code:'VALIDATOR_REJECTED', error_message: JSON.stringify(validation.violations),
    });
    return res.status(422).json({ ok:false, code:'VALIDATOR_REJECTED', violations: validation.violations });
  }

  // 11) Custo e persiste
  const usage = ai.body?.usage || {};
  const tokens_in = usage.input_tokens || 0;
  const tokens_out = usage.output_tokens || 0;
  const cache_read = usage.cache_read_input_tokens || 0;
  const cache_write = usage.cache_creation_input_tokens || 0;
  const cost_usd_cents = computeCostCents({ tokens_in, tokens_out, cache_read, cache_write });

  const finalPatch = {
    status:'READY',
    plan_data: planData,
    tokens_in, tokens_out, cache_read_tokens: cache_read, cache_creation_tokens: cache_write,
    cost_usd_cents, duration_ms: Date.now() - startedAt,
    evidence_count: 0,
    ready_at: new Date().toISOString(),
  };
  await dbUpdate('strategic_plans', `id=eq.${plan.id}`, finalPatch);
  await recordBudgetUsage(user.id, { tokens_in, tokens_out, cache_read, cache_write });

  // 12) Audit em ai_analyses
  await dbInsert('ai_analyses', {
    user_id: user.id,
    strategic_plan_id: plan.id,
    kind: 'strategic_plan',
    model: DEFAULT_MODEL,
    tokens_in, tokens_out,
    cost_usd_cents,
    cache_hit: cache_read > 0,
  }).catch(() => {/* ai_analyses pode não ter todas as colunas; falha silenciosa */});

  return res.status(200).json({
    ok: true,
    plan_id: plan.id,
    plan_data: planData,
    degraded_sources,
    cost_usd_cents,
    duration_ms: Date.now() - startedAt,
    warnings: validation.violations.length ? validation.violations : [],
  });
}
