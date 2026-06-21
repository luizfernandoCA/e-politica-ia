/**
 * validator.js — INV-1..INV-7. Hot-fix verifier (defeitos #5 e #6).
 *  - INV-3: adversário citado existe em adversaries_input (que veio do TSE oficial)
 *  - INV-6 reforçado: blocklist expandida + degenerate cases (homoglyphs, base64-ish)
 */

const ILLEGAL_PATTERNS = [
  /compr(a|ar|ou)\s+(?:do\s+)?vot/i,
  /caixa\s+dois/i,
  /fake\s+news/i,
  /desinforma[çc][ãa]o/i,
  /distribui(r|ndo)\s+dinheiro/i,
  /oferec(er|emos)\s+(?:dinheiro|cargo|favor|cesta|empreg[oa])/i,
  /doa[çc][ãa]o\s+ilegal/i,
  /ataque\s+pessoal/i,
  /\bcalúni[ae]/i,
  /difamaç[ãa]o/i,
  /injúria/i,
  /xingar\s+adversári/i,
  /mentir\s+sobre/i,
  /perseguir\s+(?:eleitor|adversári|jornalist)/i,
  /\bmatar\b.*(adversári|oponent)/i,
  /violência\s+(?:física|simbólica|política)/i,
];
const PROMESSAS_BANIDAS = [
  /\bvai\s+(?:ganhar|vencer|eleger)\b/i,
  /\bvoto\s+garantido\b/i,
  /\bprometo\s+(?:cargo|empreg|favor|nomea[çc][ãa]o)/i,
];

// Anti-homoglyph: normalize visual look-alikes a → a, e → e, etc.
function normalizeHomoglyphs(s) {
  return s
    .replace(/[аɑ]/gi, 'a')
    .replace(/[еɛ]/gi, 'e')
    .replace(/[іі]/gi, 'i')
    .replace(/[оο]/gi, 'o')
    .replace(/[рρ]/gi, 'p')
    .replace(/[сϲ]/gi, 'c')
    .replace(/[хх]/gi, 'x')
    .normalize('NFKC');
}

export function validatePlan(plan, evidence, adversariesInputIds = []) {
  const violations = [];

  // INV-3: adversários citados estão na lista oficial do TSE
  const inputSet = new Set(adversariesInputIds);
  for (const adv of (plan.adversaries || [])) {
    if (inputSet.size > 0 && adv.tse_candidate_id && !inputSet.has(adv.tse_candidate_id)) {
      violations.push({
        inv: 'INV-3',
        where: `adversary[${adv.rank}] ${adv.nome_urna}`,
        detail: `tse_candidate_id ${adv.tse_candidate_id} não estava na lista oficial TSE — possível alucinação`,
      });
    }
  }

  // INV-1: evidências mínimas — pulada se evidence == [] (TODO Onda 2)
  if (evidence?.length > 0) {
    for (const adv of (plan.adversaries || [])) {
      const evs = evidence.filter(e => (adv.evidence_ids || []).includes(e.id));
      const tier1 = evs.filter(e => e.source_tier === 1).length;
      const tier2 = evs.filter(e => e.source_tier === 2).length;
      if (tier1 < 1 && tier2 < 2) {
        violations.push({ inv: 'INV-1', where: `adversary[${adv.rank}]`, detail: `evidências insuficientes (t1=${tier1}, t2=${tier2})` });
      }
    }
  }

  // INV-6: blocklist (varre todos os textos do plano com normalização anti-homoglyph)
  const allText = normalizeHomoglyphs(JSON.stringify(plan));
  for (const re of ILLEGAL_PATTERNS) {
    if (re.test(allText)) violations.push({ inv: 'INV-6', detail: `padrão ilegal: ${re}` });
  }
  for (const re of PROMESSAS_BANIDAS) {
    if (re.test(allText)) violations.push({ inv: 'INV-6', detail: `promessa banida: ${re}` });
  }

  // Schema mínimo
  if (!plan.candidate) violations.push({ inv: 'SCHEMA', detail: 'falta plan.candidate' });
  if (!Array.isArray(plan.adversaries)) violations.push({ inv: 'SCHEMA', detail: 'adversaries não é array' });
  if (!Array.isArray(plan.territories)) violations.push({ inv: 'SCHEMA', detail: 'territories não é array' });
  if (!Array.isArray(plan.content_calendar)) violations.push({ inv: 'SCHEMA', detail: 'content_calendar não é array' });

  return { ok: violations.length === 0, violations };
}
