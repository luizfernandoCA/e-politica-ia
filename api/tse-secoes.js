/**
 * Vercel Serverless Function: api/tse-secoes.js
 *
 * Resultados eleitorais por seção (boletim de urna). Lê do cache
 * public.tse_secao_resultado populado pelo script preload local.
 *
 * Query params:
 *   ?candidate_sq=...        (filtrar por candidato)
 *   ?city=PORTO VELHO        (filtrar por município)
 *   ?electoral_zone=0002     (filtrar por zona)
 *   ?role=Vereador           (default Prefeito)
 *   ?election_id=619
 *   ?aggregate=zona|secao    (default zona — soma votos por zona)
 */

import { applyCors, fetchWithTimeout, digitsOnly, safeFilterText } from '../lib/guard.js';

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || 'https://tlnprjkiydiogrcsruxw.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, serviceKey };
}

export default async function handler(req, res) {
  if (applyCors(req, res, { methods: 'GET,OPTIONS' })) return;

  const {
    candidate_sq,
    city,
    electoral_zone,
    role,
    election_id = '619',
    aggregate = 'zona'
  } = req.query;

  // Sanitização: parâmetros do cliente NUNCA entram crus no filtro PostgREST.
  const electionId = digitsOnly(election_id) || '619';
  let candSq = '';
  if (candidate_sq !== undefined && candidate_sq !== '') {
    candSq = digitsOnly(candidate_sq);
    if (!candSq) return res.status(400).json({ success: false, error: 'candidate_sq inválido.' });
  }
  let zone = '';
  if (electoral_zone !== undefined && electoral_zone !== '') {
    zone = digitsOnly(electoral_zone);
    if (!zone) return res.status(400).json({ success: false, error: 'electoral_zone inválida.' });
  }
  const cityClean = city ? safeFilterText(city) : '';

  const { url, serviceKey } = getSupabaseConfig();
  if (!serviceKey) {
    return res
      .status(503)
      .json({ success: false, error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' });
  }

  const params = new URLSearchParams({
    election_id: `eq.${electionId}`,
    select: '*',
    order: 'electoral_zone.asc,electoral_section.asc,votes.desc'
  });
  if (candSq) params.set('candidate_sq', `eq.${candSq}`);
  if (cityClean) params.set('mun_name', `ilike.%${cityClean.toUpperCase()}%`);
  if (zone) params.set('electoral_zone', `eq.${zone}`);
  if (role) {
    const role_code = String(role).toLowerCase().includes('vereador') ? '13' : '11';
    params.set('role_code', `eq.${role_code}`);
  }

  const supaRes = await fetchWithTimeout(`${url}/rest/v1/tse_secao_resultado?${params.toString()}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json'
    }
  }, 8000);
  if (!supaRes.ok) {
    return res.status(502).json({ success: false, error: `Supabase ${supaRes.status}` });
  }
  const rows = await supaRes.json();

  // Agregação opcional (zona ou seção)
  if (aggregate === 'zona' && candidate_sq) {
    const byZone = {};
    for (const r of rows) {
      const key = r.electoral_zone;
      if (!byZone[key]) byZone[key] = { electoral_zone: key, votes: 0, sections: 0 };
      byZone[key].votes += r.votes ?? 0;
      byZone[key].sections += 1;
    }
    return res.status(200).json({
      success: true,
      candidate_sq,
      aggregate: 'zona',
      zones: Object.values(byZone).sort((a, b) => b.votes - a.votes),
      total_sections: rows.length
    });
  }

  return res.status(200).json({
    success: true,
    count: rows.length,
    rows
  });
}
