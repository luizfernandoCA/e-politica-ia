import { supabase } from '../supabase';

/**
 * fetch que anexa o access token da sessão Supabase no header Authorization.
 * Os endpoints caros (/api/assistant, /api/intel, /api/checkout) exigem uma
 * sessão válida no servidor — sem isso retornam 401. Use sempre este helper
 * em vez de `fetch` cru para chamadas a esses endpoints.
 */
export async function authedFetch(url, options = {}) {
  let token;
  try {
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token || null;
  } catch {
    token = null;
  }
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}
