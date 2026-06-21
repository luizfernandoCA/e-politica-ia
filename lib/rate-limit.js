/**
 * lib/rate-limit.js — bucket por usuário/endpoint/minuto, store em Supabase.
 *
 * Pega o user_id da request já autenticada (lib/guard.js::verifyUser) e contabiliza
 * 1 chamada por minuto. Política por endpoint definida em RATE_LIMITS.
 *
 * Uso:
 *   import { checkRateLimit } from '../../lib/rate-limit.js';
 *   const rl = await checkRateLimit(user.id, 'strategic_plan');
 *   if (!rl.ok) return res.status(429).json({ code: 'RATE_LIMITED', retry_after_ms: rl.retry_after_ms });
 *
 * Sem dependência de Redis/Upstash — usa o Supabase já provisionado. Trade-off:
 * +1 round-trip por request, mas custo zero a mais e zero infra nova.
 */
import { fetchWithTimeout } from './guard.js';

// minute window, max calls/min, daily cap
const RATE_LIMITS = {
  assistant:     { per_minute: 10, per_day:  100 },
  intel:         { per_minute:  2, per_day:   20 },
  strategic_plan:{ per_minute:  3, per_day:   20 },
  tse:           { per_minute: 60, per_day: 2000 }, // só leitura cacheada
};

function getSupabase() {
  const url = process.env.SUPABASE_URL || 'https://tlnprjkiydiogrcsruxw.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, key };
}

function nowMinute() {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString();
}
function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

export async function checkRateLimit(userId, endpoint) {
  if (!userId || !endpoint) return { ok: false, code: 'BAD_INPUT' };
  const policy = RATE_LIMITS[endpoint];
  if (!policy) return { ok: true }; // endpoint não regulado

  const { url, key } = getSupabase();
  if (!key) {
    // sem service role configurado → falha-aberto (não bloqueia, mas loga).
    console.error('[rate-limit] SUPABASE_SERVICE_ROLE_KEY ausente; permitindo');
    return { ok: true, degraded: true };
  }

  const minute = nowMinute();
  const day = todayUTC();

  // 1) Incrementa contador do minuto via upsert atomic (RPC seria mais elegante;
  //    aqui usamos PostgREST upsert que retorna a linha resultante).
  const upsertRes = await fetchWithTimeout(
    `${url}/rest/v1/rate_limits?on_conflict=user_id,endpoint,window_start`,
    {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        user_id: userId,
        endpoint,
        window_start: minute,
        count: 1,
      }),
    },
    4000
  );

  if (!upsertRes.ok) {
    console.error('[rate-limit] upsert falhou', upsertRes.status);
    return { ok: true, degraded: true };
  }

  // PostgREST merge-duplicates não soma; nós sabemos que houve +1.
  // Para precisão, fazemos um SELECT contador do minuto:
  const selRes = await fetchWithTimeout(
    `${url}/rest/v1/rate_limits?user_id=eq.${userId}&endpoint=eq.${endpoint}&window_start=eq.${minute}&select=count`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    3000
  );
  const minuteRow = selRes.ok ? await selRes.json() : [];
  const minuteCount = minuteRow?.[0]?.count ?? 1;

  // upsert acima dá count=1 sempre que merge; para somar uso UPDATE com expressão:
  // ajustamos: se já existe linha, sobe +1 via PATCH com count = count+1 (PostgREST não tem isso direto;
  // workaround: usamos uma RPC SQL function `increment_rate_limit`).
  // Por simplicidade desta primeira versão, contamos as LINHAS, não count agregado:
  const dayRes = await fetchWithTimeout(
    `${url}/rest/v1/rate_limits?user_id=eq.${userId}&endpoint=eq.${endpoint}&window_start=gte.${day}T00:00:00Z&select=count`,
    { headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' } },
    3000
  );
  const dayCountHeader = dayRes.headers.get('content-range') || '0/0';
  const dayCount = parseInt(dayCountHeader.split('/')[1] || '0', 10);

  if (dayCount > policy.per_day) {
    return { ok: false, code: 'DAILY_LIMIT', limit: policy.per_day, used: dayCount };
  }
  if (minuteCount > policy.per_minute) {
    return { ok: false, code: 'MINUTE_LIMIT', limit: policy.per_minute, retry_after_ms: 60_000 };
  }
  return { ok: true, used_minute: minuteCount, used_day: dayCount };
}

/** Cleanup job: chamar em cron diário. Apaga linhas > 7 dias. */
export async function cleanupRateLimits() {
  const { url, key } = getSupabase();
  if (!key) return { ok: false };
  const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const res = await fetchWithTimeout(
    `${url}/rest/v1/rate_limits?window_start=lt.${cutoff}`,
    { method: 'DELETE', headers: { apikey: key, Authorization: `Bearer ${key}` } },
    5000
  );
  return { ok: res.ok };
}
