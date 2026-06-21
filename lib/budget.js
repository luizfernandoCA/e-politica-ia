/**
 * lib/budget.js — guarda-chuva de custo Anthropic+X por usuário/mês.
 *
 * Caps por plano (a confirmar com pricing oficial):
 *   start:   $2.00 / mês  ( 200 cents)
 *   pro:     $5.00 / mês  ( 500 cents)
 *   premium: $15.00 / mês (1500 cents)
 *   admin:   sem cap (interno)
 *
 * Custos Anthropic Opus 4.7 (junho/2026):
 *   input  base : $3   / 1M
 *   input cached: $0.30 / 1M (cache read)
 *   cache write : $3.75 / 1M
 *   output     : $15  / 1M
 *
 * Uso:
 *   const guard = await checkBudget(user.id);
 *   if (!guard.ok) return res.status(402).json({ code:'BUDGET_EXCEEDED', ... });
 *   // ... chama Anthropic ...
 *   await recordBudgetUsage(user.id, { tokens_in, tokens_out, cache_read, cache_write });
 */
import { fetchWithTimeout } from './guard.js';

const PLAN_CAPS_CENTS = { start: 200, pro: 500, premium: 1500, admin: 100_000 };
const PRICE_PER_MTOKEN = {
  input:        3.00,
  input_cached: 0.30,
  cache_write:  3.75,
  output:      15.00,
};

function getSupabase() {
  return {
    url: process.env.SUPABASE_URL || 'https://tlnprjkiydiogrcsruxw.supabase.co',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}
function currentMonth() { return new Date().toISOString().slice(0, 7); }

export function computeCostCents({ tokens_in = 0, tokens_out = 0, cache_read = 0, cache_write = 0 }) {
  const cost =
    (tokens_in       / 1_000_000) * PRICE_PER_MTOKEN.input        +
    (cache_read      / 1_000_000) * PRICE_PER_MTOKEN.input_cached +
    (cache_write     / 1_000_000) * PRICE_PER_MTOKEN.cache_write  +
    (tokens_out      / 1_000_000) * PRICE_PER_MTOKEN.output;
  return Math.ceil(cost * 100); // cents, sempre arredondado pra cima
}

async function fetchBudgetRow(userId) {
  const { url, key } = getSupabase();
  if (!key) return null;
  const month = currentMonth();
  const r = await fetchWithTimeout(
    `${url}/rest/v1/ai_budget?user_id=eq.${userId}&month=eq.${month}&select=*`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    3000
  );
  if (!r.ok) return null;
  const arr = await r.json();
  return arr?.[0] ?? null;
}

async function ensureBudgetRow(userId) {
  const { url, key } = getSupabase();
  const existing = await fetchBudgetRow(userId);
  if (existing) return existing;
  const r = await fetchWithTimeout(
    `${url}/rest/v1/ai_budget`,
    {
      method: 'POST',
      headers: {
        apikey: key, Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation,resolution=ignore-duplicates',
      },
      body: JSON.stringify({
        user_id: userId,
        month: currentMonth(),
        plan_tier: 'start',
        monthly_cap_cents: PLAN_CAPS_CENTS.start,
      }),
    },
    3000
  );
  if (!r.ok) return null;
  const arr = await r.json();
  return arr?.[0] ?? null;
}

export async function checkBudget(userId) {
  if (!userId) return { ok: false, code: 'BAD_INPUT' };
  const { key } = getSupabase();
  if (!key) {
    console.error('[budget] SUPABASE_SERVICE_ROLE_KEY ausente; permitindo');
    return { ok: true, degraded: true };
  }
  const row = await ensureBudgetRow(userId);
  if (!row) return { ok: true, degraded: true };
  if ((row.cost_usd_cents_used ?? 0) >= (row.monthly_cap_cents ?? 200)) {
    return {
      ok: false, code: 'BUDGET_EXCEEDED',
      used_cents: row.cost_usd_cents_used,
      cap_cents: row.monthly_cap_cents,
      plan_tier: row.plan_tier,
    };
  }
  return { ok: true, used_cents: row.cost_usd_cents_used, cap_cents: row.monthly_cap_cents, plan_tier: row.plan_tier };
}

export async function recordBudgetUsage(userId, usage) {
  const { url, key } = getSupabase();
  if (!key) return { ok: false };
  const cost = computeCostCents(usage);
  const month = currentMonth();
  // PATCH com expressão (PostgREST): só funciona via RPC. Workaround: GET + PUT atomic.
  // Implementação simples: lê valor atual e soma. Race condition aceitável neste estágio
  // (custo é estimativa; cap conservador). Migrar para RPC depois.
  const row = await fetchBudgetRow(userId);
  if (!row) return { ok: false };
  const patch = {
    tokens_in_used:      (row.tokens_in_used ?? 0)      + (usage.tokens_in   ?? 0) + (usage.cache_read ?? 0),
    tokens_out_used:     (row.tokens_out_used ?? 0)     + (usage.tokens_out  ?? 0),
    x_reads_used:        (row.x_reads_used ?? 0)        + (usage.x_reads     ?? 0),
    cost_usd_cents_used: (row.cost_usd_cents_used ?? 0) + cost,
    updated_at: new Date().toISOString(),
  };
  const r = await fetchWithTimeout(
    `${url}/rest/v1/ai_budget?user_id=eq.${userId}&month=eq.${month}`,
    {
      method: 'PATCH',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    },
    3000
  );
  return { ok: r.ok, cost_cents: cost, new_total: patch.cost_usd_cents_used };
}
