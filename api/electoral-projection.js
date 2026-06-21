/**
 * api/electoral-projection.js — projeção de panorama eleitoral 2026 sem IA.
 * Cálculo determinístico do QE, votos válidos esperados, vagas, etc.
 * Pode chamar antes da Consultoria IA para o usuário ver os números.
 */
import { applyCors, verifyUser, unauthorized } from '../lib/guard.js';
import { projetarEleicao2026 } from '../lib/electoral-math.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ ok:false, code:'METHOD' });

  const user = await verifyUser(req);
  if (!user) return unauthorized(res);

  const {
    cargo, estado, mun_code,
    eleitorado_apto, comparecimento_pct, votos_validos_pct,
    vagas, n_candidatos, media_votos_eleitos_historico,
  } = req.body || {};

  if (!cargo || !estado) {
    return res.status(400).json({ ok:false, code:'BAD_INPUT', detail:'cargo e estado obrigatórios' });
  }

  const projecao = projetarEleicao2026({
    cargo, estado, mun_code,
    eleitorado_apto, comparecimento_pct, votos_validos_pct,
    vagas, n_candidatos, media_votos_eleitos_historico,
  });

  return res.status(200).json({ ok:true, ...projecao });
}
