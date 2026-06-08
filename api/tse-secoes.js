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

  const {
    candidate_sq,
    city,
    electoral_zone,
    role,
    election_id = '619',
    aggregate = 'zona'
  } = req.query;

  const { url, serviceKey } = getSupabaseConfig();
  if (!serviceKey) {
    return res
      .status(503)
      .json({ success: false, error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' });
  }

  const params = new URLSearchParams({
    election_id: `eq.${election_id}`,
    select: '*',
    order: 'electoral_zone.asc,electoral_section.asc,votes.desc'
  });
  if (candidate_sq) params.set('candidate_sq', `eq.${candidate_sq}`);
  if (city) params.set('mun_name', `ilike.%${city.toUpperCase()}%`);
  if (electoral_zone) params.set('electoral_zone', `eq.${electoral_zone}`);
  if (role) {
    const role_code = role.toLowerCase().includes('vereador') ? '13' : '11';
    params.set('role_code', `eq.${role_code}`);
  }

  const supaRes = await fetch(`${url}/rest/v1/tse_secao_resultado?${params.toString()}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json'
    }
  });
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
