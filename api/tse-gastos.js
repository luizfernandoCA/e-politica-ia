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

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || 'https://tlnprjkiydiogrcsruxw.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, serviceKey };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { candidate_sq, election_id = '619', city, role } = req.query;

  const { url, serviceKey } = getSupabaseConfig();
  if (!serviceKey) {
    return res
      .status(503)
      .json({ success: false, error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' });
  }

  // Permite buscar todos do município (sem candidate_sq) ou um candidato
  const params = new URLSearchParams({
    election_id: `eq.${election_id}`,
    select: '*',
    order: 'total_despesa.desc.nullslast'
  });
  if (candidate_sq) params.set('candidate_sq', `eq.${candidate_sq}`);
  if (city) params.set('mun_name', `ilike.%${city.toUpperCase()}%`);
  if (role) {
    const role_code = role.toLowerCase().includes('vereador') ? '13' : '11';
    params.set('role_code', `eq.${role_code}`);
  }

  const supaRes = await fetch(`${url}/rest/v1/tse_gastos?${params.toString()}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json'
    }
  });

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
