// =========================================================================
// Base eleitoral por estado — dados oficiais para o cálculo do coeficiente.
//
// depFed  = cadeiras de Deputado Federal do estado (distribuição vigente, 513).
//           Estável e pública; a redistribuição 2026 (Censo 2022 / projeto 531)
//           ainda está em definição — confirme no TSE antes de fechar números.
// estadual (Assembleia Legislativa) é DERIVADO pela Constituição, art. 27:
//           triplo da bancada federal até 36; +1 estadual por federal acima de 12.
// eleitorado = nº de eleitores aptos (TSE). Preenchido onde foi verificado;
//           para os demais, o usuário informa (1 número do TSE) — não inventamos.
// =========================================================================

export const UF_DATA = {
  AC: { nome: 'Acre', depFed: 8, eleitorado: null },
  AL: { nome: 'Alagoas', depFed: 9, eleitorado: null },
  AP: { nome: 'Amapá', depFed: 8, eleitorado: null },
  AM: { nome: 'Amazonas', depFed: 8, eleitorado: null },
  BA: { nome: 'Bahia', depFed: 39, eleitorado: null },
  CE: { nome: 'Ceará', depFed: 22, eleitorado: null },
  DF: { nome: 'Distrito Federal', depFed: 8, eleitorado: null }, // câmara distrital: 24
  ES: { nome: 'Espírito Santo', depFed: 10, eleitorado: null },
  GO: { nome: 'Goiás', depFed: 17, eleitorado: null },
  MA: { nome: 'Maranhão', depFed: 18, eleitorado: null },
  MT: { nome: 'Mato Grosso', depFed: 8, eleitorado: null },
  MS: { nome: 'Mato Grosso do Sul', depFed: 8, eleitorado: null },
  MG: { nome: 'Minas Gerais', depFed: 53, eleitorado: null },
  PA: { nome: 'Pará', depFed: 17, eleitorado: null },
  PB: { nome: 'Paraíba', depFed: 12, eleitorado: null },
  PR: { nome: 'Paraná', depFed: 30, eleitorado: null },
  PE: { nome: 'Pernambuco', depFed: 25, eleitorado: null },
  PI: { nome: 'Piauí', depFed: 10, eleitorado: null },
  RJ: { nome: 'Rio de Janeiro', depFed: 46, eleitorado: null },
  RN: { nome: 'Rio Grande do Norte', depFed: 8, eleitorado: null },
  RS: { nome: 'Rio Grande do Sul', depFed: 31, eleitorado: null },
  RO: { nome: 'Rondônia', depFed: 8, eleitorado: 1266546 }, // TRE-RO, eleições 2024 (verificado)
  RR: { nome: 'Roraima', depFed: 8, eleitorado: null },
  SC: { nome: 'Santa Catarina', depFed: 16, eleitorado: null },
  SP: { nome: 'São Paulo', depFed: 70, eleitorado: null },
  SE: { nome: 'Sergipe', depFed: 8, eleitorado: null },
  TO: { nome: 'Tocantins', depFed: 8, eleitorado: null }
};

// Assembleia Legislativa (deputados estaduais) — CF art. 27.
export function assembleiaSeats(depFed) {
  if (!depFed) return 0;
  return depFed > 12 ? 36 + (depFed - 12) : depFed * 3;
}

// Vagas em disputa por cargo na eleição GERAL de 2026, para um estado.
// Proporcionais retornam nº de cadeiras; majoritários retornam o regime.
export function vagasPorCargo(role, uf) {
  const r = (role || '').toLowerCase();
  const data = UF_DATA[uf] || null;
  if (r.includes('estadual') || r.includes('distrital')) {
    return { tipo: 'proporcional', vagas: data ? assembleiaSeats(data.depFed) : null, rotulo: 'Deputado Estadual' };
  }
  if (r.includes('federal')) {
    return { tipo: 'proporcional', vagas: data ? data.depFed : null, rotulo: 'Deputado Federal' };
  }
  if (r.includes('vereador')) {
    return { tipo: 'proporcional', vagas: null, rotulo: 'Vereador' }; // varia por município
  }
  if (r.includes('senador')) {
    return { tipo: 'majoritario', vagas: 2, rotulo: 'Senador (2 vagas em 2026)' };
  }
  if (r.includes('governador')) {
    return { tipo: 'majoritario', vagas: 1, rotulo: 'Governador (maioria, 2º turno)' };
  }
  if (r.includes('prefeito')) {
    return { tipo: 'majoritario', vagas: 1, rotulo: 'Prefeito (maioria)' };
  }
  if (r.includes('presidente')) {
    return { tipo: 'majoritario', vagas: 1, rotulo: 'Presidente (maioria, 2º turno)' };
  }
  return { tipo: 'proporcional', vagas: null, rotulo: role || 'Cargo' };
}
