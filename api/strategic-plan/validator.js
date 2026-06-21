/**
 * validator.js — INV-1..INV-7 do contrato de domínio.
 * Reprova plano que viole qualquer invariante. Retorna {ok, violations[]}.
 */

// INV-6: blocklist legal — Lei 9.504/97 + resoluções TSE
const ILLEGAL_PATTERNS = [
  /\bcompr(a|ar|ou)\s+(?:do\s+)?voto/i,
  /\bcaixa\s+dois\b/i,
  /\bfake\s+news\b/i,
  /\bdesinforma[çc][aã]o\b/i,
  /\bdistribui(r|ndo)\s+dinheiro\b/i,
  /\boferec(er|emos)\s+(?:dinheiro|cargo|favor)/i,
  /\bdoa[çc][aã]o\s+ilegal\b/i,
  /\b(?:ataque|difam[ae]r)\s+pessoal\b/i,
  /\bmentir\s+sobre\b/i,
];

const PROMESSAS_BANIDAS = [
  /\bvai\s+(?:ganhar|vencer|eleger)\b/i,    // promessa de vitória
  /\bvoto\s+garantido\b/i,
];

export function validatePlan(plan, evidence) {
  const violations = [];

  // INV-1: cada claim com ≥ 1 evidência tier-1 OU ≥ 2 tier-2
  for (const adv of (plan.adversaries || [])) {
    const evs = evidence.filter(e => (adv.evidence_ids || []).includes(e.id));
    const tier1 = evs.filter(e => e.source_tier === 1).length;
    const tier2 = evs.filter(e => e.source_tier === 2).length;
    if (tier1 < 1 && tier2 < 2) {
      violations.push({ inv:'INV-1', where:`adversary[${adv.rank}] ${adv.nome_urna}`, detail:`evidências insuficientes (t1=${tier1}, t2=${tier2})` });
    }
  }

  // INV-6: blocklist
  const allText = JSON.stringify(plan);
  for (const re of ILLEGAL_PATTERNS) {
    if (re.test(allText)) violations.push({ inv:'INV-6', where:'plan_data', detail:`pattern match: ${re}` });
  }
  for (const re of PROMESSAS_BANIDAS) {
    if (re.test(allText)) violations.push({ inv:'INV-6', where:'plan_data', detail:`promessa banida: ${re}` });
  }

  // Schema check mínimo
  if (!plan.candidate) violations.push({ inv:'SCHEMA', detail:'falta plan.candidate' });
  if (!Array.isArray(plan.adversaries)) violations.push({ inv:'SCHEMA', detail:'adversaries não é array' });
  if (!Array.isArray(plan.territories)) violations.push({ inv:'SCHEMA', detail:'territories não é array' });
  if (!Array.isArray(plan.content_calendar)) violations.push({ inv:'SCHEMA', detail:'content_calendar não é array' });

  return { ok: violations.length === 0, violations };
}
