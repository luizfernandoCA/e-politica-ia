/**
 * Vercel Serverless Function: api/tse-gastos.js
 *
 * Gastos eleitorais (prestação de contas) de um candidato no TSE.
 * Fonte: divulgacandcontas.tse.jus.br/divulga/rest/v1/prestador/consulta/
 *        {sqEleicao}/{ano}/{munCode}/{cargoCode}/90/90/{sqcand}
 *
 * Cache: public.tse_gastos (populado pelo script preload local, já que
 * o TSE bloqueia 403 em IPs cloud).
 *
 * Query params:
 *   ?candidate_sq=...     (obrigatório, sqcand do candidato)
 *   ?election_id=619      (default 619 = 2024 1º turno)
 */

import { applyCors, fetchWithTimeout, digitsOnly, safeFilterText } from '../lib/guard.js';

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || 'https://tlnprjkiydiogrcsruxw.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, serviceKey };
}

export default async function handler(req, res) {
  if (applyCors(req, res, { methods: 'GET,OPTIONS' })) return;

  const { candidate_sq, election_id = '619', city, role } = req.query;

  // Sanitização: parâmetros do cliente NUNCA entram crus no filtro PostgREST.
  const electionId = digitsOnly(election_id) || '619';
  let candSq = '';
  if (candidate_sq !== undefined && candidate_sq !== '') {
    candSq = digitsOnly(candidate_sq);
    if (!candSq) return res.status(400).json({ success: false, error: 'candidate_sq inválido.' });
  }
  const cityClean = city ? safeFilterText(city) : '';

  const { url, serviceKey } = getSupabaseConfig();
  if (!serviceKey) {
    return res
      .status(503)
      .json({ success: false, error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' });
  }

  // Permite buscar todos do município (sem candidate_sq) ou um candidato
  const params = new URLSearchParams({
    election_id: `eq.${electionId}`,
    select: '*',
    order: 'total_despesa.desc.nullslast'
  });
  if (candSq) params.set('candidate_sq', `eq.${candSq}`);
  if (cityClean) params.set('mun_name', `ilike.%${cityClean.toUpperCase()}%`);
  if (role) {
    const role_code = String(role).toLowerCase().includes('vereador') ? '13' : '11';
    params.set('role_code', `eq.${role_code}`);
  }

  const supaRes = await fetchWithTimeout(`${url}/rest/v1/tse_gastos?${params.toString()}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json'
    }
  }, 8000);

  if (!supaRes.ok) {
    return res
      .status(502)
      .json({ success: false, error: `Supabase ${supaRes.status}` });
  }

  const rows = await supaRes.json();

  return res.status(200).json({
    success: true,
    source: 'divulgacandcontas.tse.jus.br (via cache)',
    count: rows.length,
    candidates: rows
  });
}
