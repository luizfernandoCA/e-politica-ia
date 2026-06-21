/**
 * lib/electoral-math.js — cálculo de coeficiente eleitoral e projeção 2026.
 *
 * Referência legal:
 *  - Lei 9.504/97 art. 106: QE = votos válidos ÷ vagas; despreza fração ≤ 0,5; sobe se > 0,5.
 *  - Votos válidos = nominais + legenda (NÃO conta brancos/nulos).
 *  - CF art. 27: deputados estaduais = 3× DFederais até 12, depois +1 por DF além de 12.
 *
 * Vagas por estado (referência para BR — atualizar quando TSE consolidar 2026):
 *  - DF (Dep Federal): mínimo 8 (RO, RR, AP, AC), máximo 70 (SP). Projeto 513→531 ainda
 *    EM DEFINIÇÃO em jun/2026; este código usa a bancada vigente do ciclo 2022 (RO=8).
 *  - DE (Dep Estadual): RO=24 (8 federais × 3 = 24). Calcule por CF art. 27.
 *  - SF (Senador): 2026 elege 2 vagas por estado (ciclo alternado: 1 em 2022, 2 em 2026).
 *  - GV (Governador): 1.
 *
 * Inputs:
 *  - cargo: 'VR'|'PM'|'DE'|'DF'|'SF'|'GV'
 *  - eleitorado_apto: integer (do TSE; projetar com +1.5%/ano se base for 2024)
 *  - comparecimento_pct: 0..1 (default 0.79 média BR pleitos majoritários)
 *  - votos_validos_pct: 0..1 (default 0.92 para majoritários, 0.88 para proporcionais)
 *  - vagas: int (calculado automaticamente se não passado)
 *  - n_candidatos: int (esperado; default histórico se ausente)
 *  - estado: 'RO'|... (usado para inferir vagas DE/DF)
 */

// Bancada Federal por estado — vigente até confirmação do projeto 513→531 em 2026.
// Fonte: Resolução TSE 23.677/2021 (ciclo 2022). Atualizar quando 2026 for confirmado.
export const BANCADA_FEDERAL = {
  AC:8, AL:9, AM:8, AP:8, BA:39, CE:22, DF:8, ES:10, GO:17, MA:18,
  MG:53, MS:8, MT:8, PA:17, PB:12, PE:25, PI:10, PR:30, RJ:46, RN:8,
  RO:8, RR:8, RS:31, SC:16, SE:8, SP:70, TO:8,
};

// Eleitorado 2024 por estado (Estatísticas TSE post-eleição municipal).
// Usado como BASE; multiplique por (1 + 0.015)^anos para 2026.
// Aprox.; substituir por consulta real ao TSE quando preload-tse-eleitorado existir.
export const ELEITORADO_BASE_2024 = {
  AC: 614000,    AL: 2387000,   AM: 2789000,   AP: 593000,
  BA: 11210000,  CE: 6911000,   DF: 2300000,   ES: 2914000,
  GO: 4933000,   MA: 4940000,   MG: 16140000,  MS: 2032000,
  MT: 2477000,   PA: 6018000,   PB: 3022000,   PE: 6940000,
  PI: 2542000,   PR: 8528000,   RJ: 12863000,  RN: 2491000,
  RO: 1244000,   RR: 387000,    RS: 8508000,   SC: 5797000,
  SE: 1696000,   SP: 34691000,  TO: 1126000,
};

export function vagasPara(cargo, estado) {
  switch (cargo) {
    case 'PR': return 1;
    case 'GV': return 1;
    case 'SF': return 2; // ciclo 2026 = 2 vagas/estado
    case 'DF': return BANCADA_FEDERAL[estado] ?? null;
    case 'DE': {
      const df = BANCADA_FEDERAL[estado];
      if (!df) return null;
      // CF art. 27: 3× até 12, +1 por DF além de 12
      return df <= 12 ? df * 3 : 36 + (df - 12);
    }
    case 'VR':
      // Vereador é por município, não por estado. Sem cálculo aqui.
      return null;
    case 'PM': return 1;
    default: return null;
  }
}

export function isProportional(cargo) {
  return cargo === 'VR' || cargo === 'DE' || cargo === 'DF';
}

export function projetarEleitorado2026(eleitorado_2024) {
  // Projeção linear conservadora: +1.5%/ano (próximo do crescimento real BR pós-Censo 2022).
  return Math.round(eleitorado_2024 * 1.015 * 1.015);
}

/**
 * Computa o panorama eleitoral para um cargo+circunscrição em 2026.
 * Retorna sempre {disclaimer, calculations[], warnings[]} com cada cálculo explicado.
 */
export function projetarEleicao2026({
  cargo, estado, mun_code,
  eleitorado_apto,            // se null, infere do BASE_2024 (apenas para estado, não município)
  comparecimento_pct,         // se null, usa default
  votos_validos_pct,          // se null, usa default
  vagas,                       // se null, vagasPara(cargo, estado)
  n_candidatos,                // esperado para 2026 (estimativa)
  media_votos_eleitos_historico, // se houver dado real (votos médios dos top N eleitos no ciclo anterior)
}) {
  const warnings = [];
  const calcs = [];

  // Eleitorado projetado
  let projecao_eleitorado = eleitorado_apto;
  if (!projecao_eleitorado && cargo !== 'PM' && cargo !== 'VR' && estado) {
    const base = ELEITORADO_BASE_2024[estado];
    if (base) {
      projecao_eleitorado = projetarEleitorado2026(base);
      calcs.push({
        label: 'Eleitorado projetado 2026 (estado)',
        value: projecao_eleitorado.toLocaleString('pt-BR'),
        source: `TSE 2024 (${base.toLocaleString('pt-BR')}) × (1.015)² = +3,02%`,
      });
    }
  } else if (projecao_eleitorado) {
    calcs.push({
      label: 'Eleitorado apto informado',
      value: projecao_eleitorado.toLocaleString('pt-BR'),
      source: 'TSE oficial',
    });
  }
  if (!projecao_eleitorado) warnings.push('Eleitorado não disponível — coeficiente é estimativa de cima para baixo.');

  // Defaults por tipo de cargo (médias BR)
  const cmp_default = (cargo === 'VR' || cargo === 'PM') ? 0.78 : 0.79;
  const vv_default = isProportional(cargo) ? 0.88 : 0.93;
  const cmp = comparecimento_pct ?? cmp_default;
  const vv = votos_validos_pct ?? vv_default;
  if (!comparecimento_pct) warnings.push(`Comparecimento usado: ${(cmp*100).toFixed(0)}% (média BR; ajustar com dado real do município/estado)`);
  if (!votos_validos_pct) warnings.push(`Votos válidos: ${(vv*100).toFixed(0)}% (média; ajustar com dado real)`);

  const compareceram = projecao_eleitorado ? Math.round(projecao_eleitorado * cmp) : null;
  const votos_validos = compareceram ? Math.round(compareceram * vv) : null;
  if (compareceram) calcs.push({ label: 'Eleitores que devem comparecer', value: compareceram.toLocaleString('pt-BR'), source: `${(cmp*100).toFixed(0)}% × eleitorado` });
  if (votos_validos) calcs.push({ label: 'Votos válidos esperados (nominais + legenda)', value: votos_validos.toLocaleString('pt-BR'), source: `${(vv*100).toFixed(0)}% dos comparecentes (descontados brancos/nulos)` });

  // Vagas
  const vagas_calc = vagas ?? vagasPara(cargo, estado);
  if (vagas_calc) calcs.push({
    label: 'Vagas em disputa',
    value: vagas_calc,
    source: cargo === 'DE' ? `CF art. 27: ${BANCADA_FEDERAL[estado]} DFederais × regra` :
            cargo === 'DF' ? `Resolução TSE 23.677 (ciclo 2022 — projeto 531 pendente)` :
            cargo === 'SF' ? '2026: 2 vagas por estado (ciclo alternado)' :
            'cargo majoritário'
  });
  if (cargo === 'DF') warnings.push('Bancada de Deputado Federal pode mudar com projeto 513→531 (em definição); confirmar no TSE.');

  // Coeficiente eleitoral (só proporcional)
  let qe = null;
  if (isProportional(cargo) && votos_validos && vagas_calc) {
    qe = Math.round(votos_validos / vagas_calc);
    calcs.push({
      label: 'Quociente Eleitoral (QE) projetado',
      value: qe.toLocaleString('pt-BR') + ' votos',
      source: `${votos_validos.toLocaleString('pt-BR')} ÷ ${vagas_calc} vagas = ${qe.toLocaleString('pt-BR')} (Lei 9.504/97 art. 106)`,
    });
    // Votos por candidato individual: o candidato precisa fazer ≥ 10% do QE para receber cadeira da legenda (Lei 13.165/15 art. 108)
    const piso_individual = Math.round(qe * 0.10);
    calcs.push({
      label: 'Voto individual mínimo (10% do QE)',
      value: piso_individual.toLocaleString('pt-BR') + ' votos',
      source: 'Lei 13.165/15 art. 108 — só recebe cadeira quem cruza esse piso',
    });
    // Média histórica (se disponível)
    if (media_votos_eleitos_historico) {
      calcs.push({
        label: 'Votos médios dos eleitos no último pleito',
        value: media_votos_eleitos_historico.toLocaleString('pt-BR') + ' votos',
        source: 'TSE histórico (top N eleitos)',
      });
    } else {
      warnings.push('Média histórica de votos dos eleitos não pôde ser calculada — falta preload do TSE para o pleito anterior.');
    }
  }

  // Para majoritários, sem QE — explicar limiar
  if (!isProportional(cargo)) {
    let limiar = '';
    if (cargo === 'PM' || cargo === 'GV' || cargo === 'PR') limiar = 'Maioria absoluta dos votos válidos (50% + 1). Se nenhum atingir → 2º turno em municípios > 200k eleitores (PM) ou sempre (GV/PR).';
    if (cargo === 'SF') limiar = 'Os 2 mais votados se elegem (princípio majoritário simples). Sem 2º turno.';
    calcs.push({ label: 'Critério de eleição', value: limiar });
  }

  return {
    cargo, estado, mun_code,
    ano: 2026,
    is_proportional: isProportional(cargo),
    vagas: vagas_calc,
    eleitorado_estimado: projecao_eleitorado,
    votos_validos_estimados: votos_validos,
    quociente_eleitoral: qe,
    n_candidatos_esperado: n_candidatos ?? null,
    calculations: calcs,
    warnings,
    disclaimer: 'Projeção baseada em dados públicos do TSE/IBGE e médias históricas brasileiras. Comparecimento e taxa de votos válidos são ESTIMATIVAS; substitua por dado real do município/estado para precisão máxima. Não é promessa de resultado eleitoral.',
  };
}
