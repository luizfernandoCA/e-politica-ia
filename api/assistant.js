/**
 * Vercel Serverless Function: api/assistant.js
 *
 * Assistente "Mestre" — Claude Sonnet 4.6 com Tool Use.
 * O Mestre tem acesso a 5 tools que consultam a tabela `public.tse_apuracao`
 * (dados oficiais TSE) durante a conversa, permitindo respostas baseadas em
 * fatos reais e não em opinião genérica.
 *
 * Tools disponíveis:
 *   - get_apuracao_summary  → eleitorado, comparecimento, % apurado, vagas
 *   - list_candidates       → top candidatos do município/cargo (filtrável)
 *   - get_candidate         → detalhes de um candidato específico
 *   - compare_candidates    → comparativo entre N candidatos
 *   - list_parties          → partidos do município com totais e eleitos
 *
 * Variáveis de ambiente (Vercel):
 *   ANTHROPIC_API_KEY           - obrigatório
 *   SUPABASE_URL                - obrigatório (default fallback)
 *   SUPABASE_SERVICE_ROLE_KEY   - obrigatório para queries server-side
 *   ANTHROPIC_MODEL             - opcional, default claude-opus-4-7
 *
 * Prompt caching:
 *   System prompt + tools são marcados com cache_control ephemeral.
 *   Reuso ≤5min reduz custo em ~90%.
 */

// Default: Opus 4.7 — modelo Claude mais capaz disponível na Anthropic API
// (junho/2026). Override via env ANTHROPIC_MODEL se quiser Sonnet 4.6
// (mais rápido/barato) ou Haiku 4.5 (mais barato ainda).
const DEFAULT_MODEL = 'claude-opus-4-7';
const MAX_HISTORY = 20;
const MAX_TOOL_ITERATIONS = 5; // safety: limita rodadas de tool use

// =========================================================================
// Helpers Supabase
// =========================================================================
function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || 'https://tlnprjkiydiogrcsruxw.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, serviceKey };
}

async function queryApuracao(filters) {
  const { url, serviceKey } = getSupabaseConfig();
  if (!serviceKey) {
    return { error: 'SUPABASE_SERVICE_ROLE_KEY ausente — apuração indisponível.' };
  }
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, v);
  }
  const res = await fetch(`${url}/rest/v1/tse_apuracao?${params.toString()}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json'
    }
  });
  if (!res.ok) {
    return { error: `Supabase ${res.status}: ${await res.text()}` };
  }
  return res.json();
}

function normalizeCity(s) {
  return s ? s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim() : '';
}

function mapElectionId(year, round = 1) {
  const map = { '2024-1': '619', '2024-2': '620', '2020-1': '426', '2020-2': '427' };
  return map[`${year}-${round}`];
}

function mapRoleCode(role) {
  const r = (role || '').toLowerCase();
  if (r.includes('vereador')) return '13';
  return '11'; // Prefeito default
}

// =========================================================================
// Tools (executadas server-side, resultados voltam pro Claude)
// =========================================================================
async function toolGetApuracaoSummary({ city, role, year = 2024, round = 1 }) {
  const election_id = mapElectionId(year, round);
  const role_code = mapRoleCode(role);
  const rows = await queryApuracao({
    select:
      'mun_name,role_name,role_total_seats,total_voters,total_present,pct_present,sections_total,sections_counted,pct_sections_counted,election_date',
    election_id: `eq.${election_id}`,
    mun_name: `ilike.${normalizeCity(city)}%`,
    role_code: `eq.${role_code}`,
    limit: '1'
  });
  if (rows?.error) return rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: `Sem apuração para ${city}/${role}/${year}T${round}` };
  }
  return rows[0];
}

async function toolListCandidates({ city, role, year = 2024, round = 1, party, limit = 10, only_elected = false }) {
  const election_id = mapElectionId(year, round);
  const role_code = mapRoleCode(role);
  const filters = {
    select:
      'candidate_seq,candidate_urn_name,candidate_number,party_abbr,candidate_votes,candidate_percentage,candidate_outcome,candidate_is_elected',
    election_id: `eq.${election_id}`,
    mun_name: `ilike.${normalizeCity(city)}%`,
    role_code: `eq.${role_code}`,
    order: 'candidate_seq.asc',
    limit: String(Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50))
  };
  if (party) filters.party_abbr = `ilike.${party}`;
  if (only_elected) filters.candidate_is_elected = 'is.true';
  return queryApuracao(filters);
}

async function toolGetCandidate({ candidate_urn_name, city, role, year = 2024, round = 1 }) {
  const election_id = mapElectionId(year, round);
  const role_code = mapRoleCode(role);
  const rows = await queryApuracao({
    select: '*',
    election_id: `eq.${election_id}`,
    mun_name: `ilike.${normalizeCity(city)}%`,
    role_code: `eq.${role_code}`,
    candidate_urn_name: `ilike.%${candidate_urn_name.toUpperCase()}%`,
    limit: '1'
  });
  if (rows?.error) return rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: `Candidato '${candidate_urn_name}' não encontrado em ${city}.` };
  }
  return rows[0];
}

async function toolCompareCandidates({ candidate_urn_names, city, role, year = 2024, round = 1 }) {
  const results = [];
  for (const name of candidate_urn_names) {
    const r = await toolGetCandidate({ candidate_urn_name: name, city, role, year, round });
    if (r && !r.error) {
      results.push({
        nome: r.candidate_urn_name,
        partido: r.party_abbr,
        numero: r.candidate_number,
        colocacao: r.candidate_seq,
        votos: r.candidate_votes,
        percentual_validos: r.candidate_percentage,
        resultado: r.candidate_outcome
      });
    }
  }
  if (results.length === 0) {
    return { error: 'Nenhum dos candidatos foi encontrado.' };
  }
  // Ordena por votos desc e calcula diferenças
  results.sort((a, b) => (b.votos ?? 0) - (a.votos ?? 0));
  const leaderVotos = results[0].votos ?? 0;
  return results.map((r, i) => ({
    ...r,
    posicao_no_comparativo: i + 1,
    diferenca_para_lider: i === 0 ? 0 : leaderVotos - (r.votos ?? 0)
  }));
}

async function toolGetGastos({ candidate_urn_name, city, role, year = 2024, round = 1 }) {
  const election_id = mapElectionId(year, round);
  const role_code = mapRoleCode(role);
  // Achar o sqcand primeiro
  const cand = await toolGetCandidate({ candidate_urn_name, city, role, year, round });
  if (cand?.error || !cand?.candidate_sq) {
    return { error: `Candidato '${candidate_urn_name}' não encontrado em ${city}.` };
  }
  const { url, serviceKey } = getSupabaseConfig();
  if (!serviceKey) return { error: 'SUPABASE_SERVICE_ROLE_KEY ausente.' };
  const params = new URLSearchParams({
    election_id: `eq.${election_id}`,
    candidate_sq: `eq.${cand.candidate_sq}`,
    role_code: `eq.${role_code}`,
    select:
      'candidate_urn_name,party_abbr,has_data,prestacao_status,total_receita,total_despesa,total_doacoes_proprio,limite_legal,custo_por_voto,taxa_uso_limite',
    limit: '1'
  });
  const r = await fetch(`${url}/rest/v1/tse_gastos?${params.toString()}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  });
  if (!r.ok) return { error: `Supabase ${r.status}` };
  const rows = await r.json();
  if (rows.length === 0) {
    return {
      error: `Sem prestação de contas cacheada para ${candidate_urn_name}. Rode o script preload-tse-gastos local.`
    };
  }
  return rows[0];
}

async function toolGetVotosPorZona({ candidate_urn_name, city, role, year = 2024, round = 1 }) {
  const election_id = mapElectionId(year, round);
  const cand = await toolGetCandidate({ candidate_urn_name, city, role, year, round });
  if (cand?.error || !cand?.candidate_sq) {
    return { error: `Candidato '${candidate_urn_name}' não encontrado.` };
  }
  const { url, serviceKey } = getSupabaseConfig();
  if (!serviceKey) return { error: 'SUPABASE_SERVICE_ROLE_KEY ausente.' };
  const params = new URLSearchParams({
    election_id: `eq.${election_id}`,
    candidate_sq: `eq.${cand.candidate_sq}`,
    select: 'electoral_zone,electoral_section,votes,polling_place',
    order: 'electoral_zone.asc,votes.desc'
  });
  const r = await fetch(`${url}/rest/v1/tse_secao_resultado?${params.toString()}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  });
  if (!r.ok) return { error: `Supabase ${r.status}` };
  const rows = await r.json();
  if (rows.length === 0) {
    return {
      error: `Sem boletim de urna cacheado para ${candidate_urn_name}. Rode o script preload-tse-secoes local.`,
      candidate_total_votes: cand.candidate_votes
    };
  }
  // Agregar por zona
  const byZone = {};
  for (const r of rows) {
    if (!byZone[r.electoral_zone]) byZone[r.electoral_zone] = { zona: r.electoral_zone, votos: 0, secoes: 0 };
    byZone[r.electoral_zone].votos += r.votes ?? 0;
    byZone[r.electoral_zone].secoes += 1;
  }
  // Top 5 seções
  const topSecoes = rows.slice(0, 5).map((r) => ({
    zona: r.electoral_zone,
    secao: r.electoral_section,
    local: r.polling_place,
    votos: r.votes
  }));
  return {
    candidate_urn_name: cand.candidate_urn_name,
    total_votos: cand.candidate_votes,
    distribuicao_por_zona: Object.values(byZone).sort((a, b) => b.votos - a.votos),
    top_5_secoes_mais_votos: topSecoes,
    total_secoes_com_voto: rows.length
  };
}

async function toolListParties({ city, role, year = 2024, round = 1 }) {
  const election_id = mapElectionId(year, round);
  const role_code = mapRoleCode(role);
  const rows = await queryApuracao({
    select:
      'party_abbr,party_number,party_total_nominal_votes,party_total_legend_votes,party_seats_elected,candidate_is_elected,candidate_votes',
    election_id: `eq.${election_id}`,
    mun_name: `ilike.${normalizeCity(city)}%`,
    role_code: `eq.${role_code}`,
    order: 'party_total_nominal_votes.desc'
  });
  if (rows?.error || !Array.isArray(rows)) return rows;
  // Agrupar por partido
  const byParty = {};
  for (const r of rows) {
    const key = r.party_abbr || '—';
    if (!byParty[key]) {
      byParty[key] = {
        partido: r.party_abbr,
        numero: r.party_number,
        votos_nominais: r.party_total_nominal_votes,
        votos_legenda: r.party_total_legend_votes,
        eleitos_partido: r.party_seats_elected,
        eleitos_no_municipio: 0,
        candidatos: 0,
        total_votos_candidatos: 0
      };
    }
    byParty[key].candidatos += 1;
    if (r.candidate_is_elected) byParty[key].eleitos_no_municipio += 1;
    byParty[key].total_votos_candidatos += r.candidate_votes ?? 0;
  }
  return Object.values(byParty).sort(
    (a, b) => (b.votos_nominais ?? 0) - (a.votos_nominais ?? 0)
  );
}

const TOOL_REGISTRY = {
  get_apuracao_summary: toolGetApuracaoSummary,
  list_candidates: toolListCandidates,
  get_candidate: toolGetCandidate,
  compare_candidates: toolCompareCandidates,
  list_parties: toolListParties,
  get_gastos: toolGetGastos,
  get_votos_por_zona: toolGetVotosPorZona
};

// =========================================================================
// Definição dos tools no formato Claude
// =========================================================================
const TOOLS = [
  {
    name: 'get_apuracao_summary',
    description:
      'Retorna agregados da apuração TSE de um município/cargo: eleitorado total, comparecimento, % apurado, número de seções, vagas em disputa. Use ANTES de qualquer análise para entender o contexto eleitoral.',
    input_schema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'Nome do município (ex: PORTO VELHO)' },
        role: { type: 'string', enum: ['Prefeito', 'Vereador'], description: 'Cargo' },
        year: { type: 'integer', enum: [2024, 2020], description: 'Ano (default 2024)' },
        round: { type: 'integer', enum: [1, 2], description: 'Turno (default 1)' }
      },
      required: ['city', 'role']
    }
  },
  {
    name: 'list_candidates',
    description:
      'Lista candidatos de um município/cargo, ordenados por colocação. Pode filtrar por partido. Use limit pra controlar quantidade (1-50).',
    input_schema: {
      type: 'object',
      properties: {
        city: { type: 'string' },
        role: { type: 'string', enum: ['Prefeito', 'Vereador'] },
        year: { type: 'integer', enum: [2024, 2020] },
        round: { type: 'integer', enum: [1, 2] },
        party: { type: 'string', description: 'Sigla do partido (PT, PL, REPUBLICANOS, etc.)' },
        limit: { type: 'integer', description: 'Quantos retornar (1-50, default 10)' },
        only_elected: { type: 'boolean', description: 'true = só candidatos eleitos' }
      },
      required: ['city', 'role']
    }
  },
  {
    name: 'get_candidate',
    description: 'Busca um candidato específico pelo nome de urna. Retorna detalhe completo: votos, %, colocação, resultado oficial, dados do partido, agregados da eleição.',
    input_schema: {
      type: 'object',
      properties: {
        candidate_urn_name: { type: 'string', description: 'Nome de urna ou parte (busca case-insensitive)' },
        city: { type: 'string' },
        role: { type: 'string', enum: ['Prefeito', 'Vereador'] },
        year: { type: 'integer', enum: [2024, 2020] },
        round: { type: 'integer', enum: [1, 2] }
      },
      required: ['candidate_urn_name', 'city', 'role']
    }
  },
  {
    name: 'compare_candidates',
    description:
      'Compara 2-5 candidatos lado a lado em um município/cargo. Útil para análise competitiva: quem ficou à frente, diferença em votos.',
    input_schema: {
      type: 'object',
      properties: {
        candidate_urn_names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista de nomes de urna (2 a 5)'
        },
        city: { type: 'string' },
        role: { type: 'string', enum: ['Prefeito', 'Vereador'] },
        year: { type: 'integer', enum: [2024, 2020] },
        round: { type: 'integer', enum: [1, 2] }
      },
      required: ['candidate_urn_names', 'city', 'role']
    }
  },
  {
    name: 'list_parties',
    description:
      'Lista partidos de um município/cargo com agregados: votos nominais, legenda, candidatos, eleitos. Use para análise de força partidária.',
    input_schema: {
      type: 'object',
      properties: {
        city: { type: 'string' },
        role: { type: 'string', enum: ['Prefeito', 'Vereador'] },
        year: { type: 'integer', enum: [2024, 2020] },
        round: { type: 'integer', enum: [1, 2] }
      },
      required: ['city', 'role']
    }
  },
  {
    name: 'get_gastos',
    description:
      'Retorna a prestação de contas eleitoral de um candidato: total de receitas, despesas, doações próprias, limite legal, custo por voto, taxa de uso do limite. Útil para análise financeira da campanha.',
    input_schema: {
      type: 'object',
      properties: {
        candidate_urn_name: { type: 'string' },
        city: { type: 'string' },
        role: { type: 'string', enum: ['Prefeito', 'Vereador'] },
        year: { type: 'integer', enum: [2024, 2020] }
      },
      required: ['candidate_urn_name', 'city', 'role']
    }
  },
  {
    name: 'get_votos_por_zona',
    description:
      'Retorna a distribuição de votos de um candidato POR ZONA ELEITORAL (boletim de urna). Lista top 5 seções com mais votos e total por zona. Útil para identificar bases geográficas e oportunidades de crescimento.',
    input_schema: {
      type: 'object',
      properties: {
        candidate_urn_name: { type: 'string' },
        city: { type: 'string' },
        role: { type: 'string', enum: ['Prefeito', 'Vereador'] },
        year: { type: 'integer', enum: [2024, 2020] }
      },
      required: ['candidate_urn_name', 'city', 'role']
    }
  }
];

// =========================================================================
// Handler principal
// =========================================================================
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      code: 'AI_NOT_CONFIGURED',
      message:
        'Assistente IA não configurado. Defina a variável de ambiente ANTHROPIC_API_KEY ' +
        '(console.anthropic.com) no painel da Vercel.'
    });
  }

  try {
    const { messages, context } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'messages é obrigatório.' });
    }

    const candidateName = context?.candidateName || 'o candidato';
    const candidateParty = context?.candidateParty || '';
    const city = context?.city || 'seu município';
    const role = context?.role || 'Prefeito';

    const systemPrompt = `Você é o **Mestre**, estrategista político sênior com inteligência artificial da plataforma brasileira e-politica.ia. Estilo: experiente, direto, analítico — como um general de campanha que já fez muitas eleições municipais no Brasil.

Contexto da campanha do usuário:
- Candidato: ${candidateName} ${candidateParty ? `(${candidateParty})` : ''}
- Cargo em disputa: ${role}
- Município: ${city}

Você tem acesso a TOOLS que consultam dados oficiais do TSE armazenados na plataforma:
- get_apuracao_summary: agregados da eleição (eleitorado, % apurado, vagas).
- list_candidates: ranking de candidatos por município/cargo.
- get_candidate: detalhe de um candidato específico.
- compare_candidates: comparativo entre 2-5 candidatos.
- list_parties: partidos do município com votos e eleitos.
- get_gastos: prestação de contas eleitorais (receitas, despesas, custo/voto, limite legal).
- get_votos_por_zona: distribuição geográfica do voto (zona eleitoral e top seções).

USE AS TOOLS sempre que a pergunta envolver números, comparações, contexto eleitoral, adversários, partidos ou histórico — não chute, busque. Depois sintetize.

Diretrizes:
- Responda sempre em português do Brasil, tom profissional, conciso e tático (sem floreios).
- Estruture em Markdown (### títulos, listas numeradas, **negrito** nos pontos-chave) para leitura rápida em mobile.
- Cite os números reais que as tools devolveram (não invente). Se a tool falhar, diga claramente que falta o dado.
- Dê recomendações táticas concretas: segmentação geográfica, mobilização de lideranças, comunicação digital, agenda de rua, alocação de orçamento.
- Respeite rigorosamente a legislação eleitoral (Lei 9.504/97 e Resoluções TSE): nunca sugira compra de votos, caixa dois, desinformação, ataques pessoais, abuso de poder econômico ou prática ilegal.
- Conciso: máximo ~400 palavras na resposta final.`;

    // Histórico inicial enviado pelo client
    const baseHistory = messages.slice(-MAX_HISTORY).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text
    }));

    // Loop de tool use (até MAX_TOOL_ITERATIONS rodadas)
    let conversationMessages = baseHistory;
    let finalText = '';
    let toolCallsLog = [];

    for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
          max_tokens: 1500,
          system: [
            {
              type: 'text',
              text: systemPrompt,
              cache_control: { type: 'ephemeral' }
            }
          ],
          tools: TOOLS,
          messages: conversationMessages
        })
      });

      const data = await anthropicRes.json();

      if (!anthropicRes.ok) {
        console.error('[Anthropic API Error]:', data);
        return res.status(502).json({
          success: false,
          message: data?.error?.message || 'Erro ao consultar o modelo de IA.'
        });
      }

      // Coleta tool_use blocks
      const toolUses = (data.content || []).filter((b) => b.type === 'tool_use');
      const textBlocks = (data.content || []).filter((b) => b.type === 'text');

      // Se não tem tool use, fim do loop — usa o texto final
      if (toolUses.length === 0 || data.stop_reason !== 'tool_use') {
        finalText = textBlocks.map((b) => b.text).join('\n');
        break;
      }

      // Executa cada tool e prepara tool_result
      const toolResults = [];
      for (const tu of toolUses) {
        const fn = TOOL_REGISTRY[tu.name];
        let result;
        try {
          result = fn ? await fn(tu.input || {}) : { error: `Tool desconhecida: ${tu.name}` };
        } catch (err) {
          result = { error: `Falha em ${tu.name}: ${err.message}` };
        }
        toolCallsLog.push({ name: tu.name, input: tu.input, ok: !result?.error });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify(result).slice(0, 12000) // safety cap
        });
      }

      // Reenvia conversação com tool_use + tool_result
      conversationMessages = [
        ...conversationMessages,
        { role: 'assistant', content: data.content },
        { role: 'user', content: toolResults }
      ];
    }

    if (!finalText) {
      finalText =
        '⚠️ Não consegui formular uma resposta final após consultar os dados. ' +
        'Tente reformular a pergunta com menos escopo.';
    }

    return res.status(200).json({
      success: true,
      text: finalText,
      tools_used: toolCallsLog
    });
  } catch (error) {
    console.error('[API Assistant Error]:', error);
    return res.status(500).json({ success: false, message: 'Falha interna no assistente IA.' });
  }
}
