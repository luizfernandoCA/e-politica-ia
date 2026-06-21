/**
 * TSE collector — usa o cache `tse_apuracao` já populado em produção.
 * Não chama o portal do TSE direto (latência alta + risco de rate-limit).
 *
 * Retorna: { adversaries[], historical_results[], voter_universe }
 */
import { fetchWithTimeout } from '../../../lib/guard.js';

const TSE_ELECTION_IDS = { '2024-1':'619','2024-2':'620','2022-1':'544','2020-1':'426' };
const CARGO_TO_TSE = { PR:'1', GV:'3', SF:'5', DF:'7', DE:'8', PM:'11', VR:'13' };

function sb() { return { url: process.env.SUPABASE_URL || 'https://tlnprjkiydiogrcsruxw.supabase.co', key: process.env.SUPABASE_SERVICE_ROLE_KEY }; }

export async function collectTSE({ estado, cargo_alvo, mun_code, ano_eleicao, tse_candidate_id }) {
  const { url, key } = sb();
  if (!key) return { ok:false, code:'NO_SERVICE_ROLE' };

  const role_code = CARGO_TO_TSE[cargo_alvo];
  // Eleições históricas comparáveis (mesmo cargo)
  const histElectionId = TSE_ELECTION_IDS[`${ano_eleicao - 4}-1`]; // 4 anos antes
  const sources = [];

  // 1) Histórico do município para o cargo (do cache tse_apuracao)
  let history = [];
  if (histElectionId && mun_code) {
    const r = await fetchWithTimeout(
      `${url}/rest/v1/tse_apuracao?election_id=eq.${histElectionId}&role_code=eq.${role_code}&mun_code=eq.${mun_code}&select=candidate_votes,role_total_seats,total_voters,total_present,pct_present&limit=1`,
      { headers: { apikey:key, Authorization:`Bearer ${key}` } },
      6000
    );
    if (r.ok) { history = await r.json(); sources.push({ source:'tse_apuracao', election:histElectionId, mun_code, role_code, count: history.length }); }
  }

  // 2) Candidatos atuais do município/cargo (catálogo `tse_candidates` — cache global)
  let candidates = [];
  const curElectionId = TSE_ELECTION_IDS[`${ano_eleicao}-1`];
  if (curElectionId) {
    const filters = [`election_id=eq.${curElectionId}`, `cargo_code=eq.${role_code}`];
    if (mun_code) filters.push(`mun_code=eq.${mun_code}`); else if (estado) filters.push(`estado=eq.${estado}`);
    const r = await fetchWithTimeout(
      `${url}/rest/v1/tse_candidates?${filters.join('&')}&select=*&limit=200`,
      { headers: { apikey:key, Authorization:`Bearer ${key}` } },
      6000
    );
    if (r.ok) candidates = await r.json();
  }

  // 3) Adversários = candidatos atuais excluindo o próprio
  const adversaries = candidates
    .filter(c => c.tse_candidate_id !== tse_candidate_id)
    .map(c => ({
      tse_candidate_id: c.tse_candidate_id,
      nome_urna: c.nome_urna,
      partido_sigla: c.partido_sigla,
      numero_urna: c.numero_urna,
      situacao: c.situacao,
    }));

  const voter_universe = history[0]
    ? { total_voters: history[0].total_voters, last_turnout_pct: history[0].pct_present, role_total_seats: history[0].role_total_seats }
    : null;

  return {
    ok: true,
    adversaries,
    historical_results: history,
    voter_universe,
    sources,
    notes: candidates.length === 0
      ? `Catálogo tse_candidates ainda não populado para election_id=${curElectionId}. Rodar cron preload-tse-candidatos.`
      : `${candidates.length} candidatos coletados; ${adversaries.length} adversários potenciais.`,
  };
}
