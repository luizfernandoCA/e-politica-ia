/**
 * lib/rate-limit.js — bucket atômico via RPC SQL (atomic_rate_limit_check).
 * Versão NEMESIS3 hot-fix do verifier (defeito #2): sem race condition.
 */
import { fetchWithTimeout } from './guard.js';

const RATE_LIMITS = {
  assistant:      { per_minute: 10, per_day:  100 },
  intel:          { per_minute:  2, per_day:   20 },
  strategic_plan: { per_minute:  3, per_day:   20 },
  tse:            { per_minute: 60, per_day: 2000 },
};

function sb() { return { url: process.env.SUPABASE_URL || 'https://tlnprjkiydiogrcsruxw.supabase.co', key: process.env.SUPABASE_SERVICE_ROLE_KEY }; }

export async function checkRateLimit(userId, endpoint) {
  if (!userId || !endpoint) return { ok: false, code: 'BAD_INPUT' };
  const policy = RATE_LIMITS[endpoint];
  if (!policy) return { ok: true };

  const { url, key } = sb();
  if (!key) { console.error('[rate-limit] service role ausente; degraded'); return { ok: true, degraded: true }; }

  const res = await fetchWithTimeout(`${url}/rest/v1/rpc/atomic_rate_limit_check`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p_user_id: userId, p_endpoint: endpoint,
      p_per_minute: policy.per_minute, p_per_day: policy.per_day,
    }),
  }, 4000);

  if (!res.ok) {
    console.error('[rate-limit] rpc falhou', res.status);
    return { ok: true, degraded: true };
  }
  return res.json();
}
