/**
 * lib/budget.js — cap mensal atômico via RPC SQL.
 * Versão NEMESIS3 hot-fix do verifier (defeito #3): UPDATE com guard na mesma transação.
 */
import { fetchWithTimeout } from './guard.js';

const PRICE_PER_MTOKEN = {
  input:        3.00,
  input_cached: 0.30,
  cache_write:  3.75,
  output:      15.00,
};

function sb() { return { url: process.env.SUPABASE_URL || 'https://tlnprjkiydiogrcsruxw.supabase.co', key: process.env.SUPABASE_SERVICE_ROLE_KEY }; }

export function computeCostCents({ tokens_in = 0, tokens_out = 0, cache_read = 0, cache_write = 0 }) {
  const cost =
    (tokens_in   / 1_000_000) * PRICE_PER_MTOKEN.input        +
    (cache_read  / 1_000_000) * PRICE_PER_MTOKEN.input_cached +
    (cache_write / 1_000_000) * PRICE_PER_MTOKEN.cache_write  +
    (tokens_out  / 1_000_000) * PRICE_PER_MTOKEN.output;
  return Math.ceil(cost * 100);
}

async function rpc(name, args) {
  const { url, key } = sb();
  if (!key) return { ok: true, degraded: true };
  const r = await fetchWithTimeout(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  }, 4000);
  if (!r.ok) { console.error('[budget] rpc', name, r.status); return { ok: true, degraded: true }; }
  return r.json();
}

export async function checkBudget(userId) {
  if (!userId) return { ok: false, code: 'BAD_INPUT' };
  return rpc('atomic_budget_check', { p_user_id: userId });
}

export async function chargeBudget(userId, usage) {
  if (!userId) return { ok: false, code: 'BAD_INPUT' };
  const cost = computeCostCents(usage);
  const result = await rpc('atomic_budget_charge', {
    p_user_id: userId,
    p_cost_cents: cost,
    p_tokens_in: (usage.tokens_in ?? 0) + (usage.cache_read ?? 0),
    p_tokens_out: usage.tokens_out ?? 0,
    p_x_reads: usage.x_reads ?? 0,
  });
  return { ...result, cost_cents: cost };
}

// Backwards-compat alias (não muda chamadas existentes na generate.js)
export const recordBudgetUsage = chargeBudget;
