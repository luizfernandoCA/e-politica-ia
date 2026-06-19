/**
 * lib/guard.js — utilitários de segurança compartilhados pelas funções serverless.
 *
 * Fica FORA de /api de propósito: a Vercel só transforma arquivos dentro de
 * `api/` em endpoints, então este módulo é importável (`../lib/guard.js`) sem
 * virar uma rota pública.
 *
 * Cobre os achados da auditoria NEMESIS:
 *  - applyCors        → allow-list de origem (substitui Allow-Origin:* + Credentials:true)
 *  - verifyUser       → valida o JWT do Supabase no servidor (GET /auth/v1/user)
 *  - fetchWithTimeout → AbortController em todo fetch externo (evita exaustão de função)
 *  - readBody / limites de tamanho de input (evita amplificação de custo)
 *  - sanitizadores de parâmetro PostgREST (evita injeção de operador)
 */

import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// CORS — allow-list em vez de coringa
// ---------------------------------------------------------------------------
const STATIC_ALLOWED = [
  process.env.APP_URL,
  'https://e-politica-ia.vercel.app'
].filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (STATIC_ALLOWED.includes(origin)) return true;
  // Previews da Vercel do próprio projeto e localhost de desenvolvimento.
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  if (/^http:\/\/localhost(:\d+)?$/i.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin)) return true;
  return false;
}

/**
 * Aplica CORS restrito por origem. Retorna true se a requisição era um
 * preflight OPTIONS já respondido (o handler deve dar return em seguida).
 */
export function applyCors(req, res, { methods = 'POST,OPTIONS' } = {}) {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  // Sem Allow-Credentials: estes endpoints autenticam por Bearer token, não cookie.
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Autenticação — valida o access token do Supabase contra o servidor de auth
// ---------------------------------------------------------------------------
const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://tlnprjkiydiogrcsruxw.supabase.co';
// Chave publicável (anon) — segura para uso como apikey; valida o JWT do usuário.
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable_RgTl4pl6flsr21DUvzeJkg_GIutzG7b';

/**
 * Extrai o Bearer token e o valida em GET /auth/v1/user.
 * Retorna { id, email } se válido, ou null caso contrário (token ausente,
 * inválido, expirado ou erro de rede). Nunca lança.
 */
export async function verifyUser(req) {
  try {
    const auth = req.headers.authorization || req.headers.Authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!token) return null;
    const r = await fetchWithTimeout(
      `${SUPABASE_URL}/auth/v1/user`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } },
      5000
    );
    if (!r.ok) return null;
    const user = await r.json();
    if (!user?.id) return null;
    return { id: user.id, email: user.email || null };
  } catch {
    return null;
  }
}

/** Responde 401 padronizado para chamadas sem sessão válida. */
export function unauthorized(res) {
  return res.status(401).json({
    success: false,
    code: 'UNAUTHENTICATED',
    message: 'Sessão necessária. Faça login para usar este recurso.'
  });
}

// ---------------------------------------------------------------------------
// fetch com timeout — todo fetch externo deve usar isto
// ---------------------------------------------------------------------------
export async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------------------------------------
// Limites de input — evita amplificação de custo / payloads gigantes
// ---------------------------------------------------------------------------
/** true se a string passa do limite de caracteres. */
export function tooLong(value, max) {
  return typeof value === 'string' && value.length > max;
}

// ---------------------------------------------------------------------------
// Sanitização de parâmetros para filtros PostgREST
// ---------------------------------------------------------------------------
/** Apenas dígitos; retorna '' se inválido (uso: zona, election_id, ano). */
export function digitsOnly(value, maxLen = 12) {
  const s = String(value ?? '').trim();
  return /^\d{1,12}$/.test(s) && s.length <= maxLen ? s : '';
}

/**
 * Sanitiza texto livre que entrará num filtro PostgREST `ilike`/`eq`.
 * Remove os metacaracteres que permitiriam injeção de operador
 * (`,` `.` `(` `)` `:` `*` `%` e aspas) e limita o tamanho.
 */
export function safeFilterText(value, maxLen = 80) {
  return String(value ?? '')
    .replace(/[,.():*%"'\\]/g, ' ')
    .trim()
    .slice(0, maxLen);
}

// ---------------------------------------------------------------------------
// Mercado Pago — validação de assinatura do webhook (HMAC-SHA256)
// Doc oficial: manifesto `id:{data.id};request-id:{x-request-id};ts:{ts};`
// ---------------------------------------------------------------------------
/**
 * Valida o header x-signature do Mercado Pago.
 * Opt-in: só valida se MP_WEBHOOK_SECRET estiver definido. Sem o segredo,
 * retorna { configured:false } e o chamador segue com o re-fetch autoritativo
 * (mitigação já existente), sem quebrar o webhook em produção.
 */
export function verifyMercadoPagoSignature(req, dataId) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return { configured: false, valid: false };

  const sigHeader = req.headers['x-signature'] || '';
  const requestId = req.headers['x-request-id'] || '';
  const parts = Object.fromEntries(
    String(sigHeader)
      .split(',')
      .map((kv) => kv.split('=').map((s) => s.trim()))
      .filter((p) => p.length === 2)
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return { configured: true, valid: false };

  // data.id alfanumérico deve ser minúsculo (regra MP); numérico é indiferente.
  // A doc MP manda OMITIR o segmento ausente (não enviar request-id vazio).
  const id = String(dataId ?? '').toLowerCase();
  let manifest = '';
  if (id) manifest += `id:${id};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  let valid = false;
  try {
    valid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    /* tamanhos diferentes ⇒ assinatura inválida */
  }
  return { configured: true, valid };
}
