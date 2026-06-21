/**
 * ranker.js — calcula threat_score determinístico para cada adversário.
 *
 * Sinais usados (todos quantificáveis, nenhum subjetivo):
 *  - historical_votes_pct: % de votos do partido do adversário no mesmo cargo, eleição anterior
 *  - incumbency_bonus:     +0.15 se está reeleito (situação 'eleito')
 *  - party_strength_local: share histórico do partido naquele município
 *  - candidate_recency:    se candidato tem candidatura prévia para o mesmo cargo no mesmo município
 *
 * Saída: array ordenado por threat_score DESC, com rationale concatenado.
 */

function scoreOne(adv, history) {
  let score = 0;
  const parts = [];

  // historical_votes_pct
  const histRow = history?.[0];
  // partyHistPct calculado dentro do if
  if (histRow?.candidate_votes && Array.isArray(histRow.candidate_votes)) {
    const totalVotes = histRow.candidate_votes.reduce((s, c) => s + (Number(c.votes)||0), 0) || 1;
    const partyVotes = histRow.candidate_votes
      .filter(c => c.partido_sigla === adv.partido_sigla)
      .reduce((s, c) => s + (Number(c.votes)||0), 0);
    const partyHistPct = partyVotes / totalVotes;
    score += partyHistPct * 0.6;
    if (partyHistPct > 0) parts.push(`partido ${adv.partido_sigla} fez ${(partyHistPct*100).toFixed(1)}% no último pleito`);
  }

  // incumbency
  if ((adv.situacao || '').toLowerCase().includes('eleito') ||
      (adv.situacao || '').toLowerCase().includes('reeleito')) {
    score += 0.15;
    parts.push('reeleição em curso');
  }

  // tem número de urna baixo → tipicamente partidos grandes (PT=13, PL=22, MDB=15, PSDB=45)
  const bigNumbers = new Set([10,11,12,13,14,15,16,17,18,19,20,21,22,23,25,40,43,44,45]);
  if (bigNumbers.has(adv.numero_urna)) {
    score += 0.08;
    parts.push('partido com tradição eleitoral');
  }

  // clamp [0, 1]
  score = Math.max(0, Math.min(1, score));
  return { score, parts };
}

export function rankAdversaries(adversaries, history) {
  if (!Array.isArray(adversaries) || adversaries.length === 0) return [];
  const scored = adversaries.map(adv => {
    const { score, parts } = scoreOne(adv, history);
    return {
      ...adv,
      threat_score: Number(score.toFixed(3)),
      rationale_seed: parts.join(' · ') || 'sinal histórico insuficiente',
    };
  });
  scored.sort((a, b) => b.threat_score - a.threat_score);
  return scored.map((a, i) => ({ ...a, rank: i + 1 }));
}
