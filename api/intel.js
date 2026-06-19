/**
 * Vercel Serverless Function: api/intel.js
 *
 * NÚCLEO DE INTELIGÊNCIA — "Consultoria Política E-Poliana".
 *
 * Usa a API do Claude COM BUSCA WEB NATIVA (server tool web_search) para,
 * a partir do nome/cargo/município do candidato:
 *   1. Rastrear menções reais ao candidato na internet (notícias, redes, sites)
 *   2. Inferir a área de atuação e o posicionamento político
 *   3. Cruzar com indicadores socioeconômicos oficiais de Rondônia (IBGE/TSE/Atlas)
 *   4. Produzir análise SWOT fundamentada + cenários preditivos
 *   5. Recomendar narrativas, públicos-alvo e plano de ação tático
 *
 * Retorna um relatório de consultoria estruturado em Markdown + as fontes
 * (URLs) que o modelo efetivamente consultou na web.
 *
 * Variáveis de ambiente (Vercel):
 *   ANTHROPIC_API_KEY  (obrigatória)  - console.anthropic.com/settings/keys
 *   ANTHROPIC_MODEL    (opcional)     - default: claude-sonnet-4-6
 */

import { applyCors, verifyUser, unauthorized, fetchWithTimeout, tooLong } from '../lib/guard.js';

export const config = { maxDuration: 300 };

const DEFAULT_MODEL = 'claude-sonnet-4-6';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  // Endpoint mais caro do sistema (web_search + 8k tokens): exige sessão válida.
  const user = await verifyUser(req);
  if (!user) return unauthorized(res);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      code: 'AI_NOT_CONFIGURED',
      message:
        'Núcleo de inteligência inativo. Configure ANTHROPIC_API_KEY no painel da Vercel ' +
        'para habilitar a pesquisa web e a análise de consultoria.'
    });
  }

  try {
    const {
      candidateName,
      party = '',
      role = 'Prefeito',
      city = '',
      state = 'RO',
      focusAreas = '',
      electoralData = null
    } = req.body || {};

    if (!candidateName || !city) {
      return res.status(400).json({
        success: false,
        message: 'candidateName e city são obrigatórios.'
      });
    }
    // Limites de input: barra payloads gigantes que inflam tokens / custo.
    if (
      tooLong(candidateName, 120) || tooLong(city, 120) || tooLong(party, 80) ||
      tooLong(role, 80) || tooLong(focusAreas, 1000)
    ) {
      return res.status(413).json({ success: false, message: 'Parâmetros longos demais.' });
    }

    const stateName = state === 'RO' ? 'Rondônia' : state;

    const electoralContext = electoralData
      ? `\n\nDADOS ELEITORAIS JÁ COLETADOS (TSE) PARA CONTEXTO:\n${JSON.stringify(electoralData).slice(0, 4000)}`
      : '';

    const systemPrompt = `Você é a E-Poliana, consultora política sênior de inteligência de dados, com 20 anos de experiência em campanhas eleitorais brasileiras e domínio de ciência de dados eleitoral. Você produz consultorias estratégicas de altíssimo nível — equivalentes às de grandes institutos — fundamentadas em DADOS REAIS pesquisados na web, nunca em achismos genéricos.

REGRAS DE OURO:
- Use a ferramenta de busca web de forma agressiva e inteligente: faça múltiplas buscas para (a) menções ao candidato em NOTÍCIAS e em REDES SOCIAIS (Instagram, Facebook, X/Twitter, TikTok, YouTube, LinkedIn), (b) indicadores socioeconômicos do município e de ${stateName}, (c) contexto político local, (d) resultados eleitorais históricos.
- PRIORIZE menções RECENTES (2025 e 2026); inclua a data de cada menção. O foco é o ciclo eleitoral de 2026.
- TODA afirmação factual relevante deve vir de uma fonte real e VERIFICÁVEL encontrada na busca (link que o usuário possa abrir e conferir no Google). Cite a fonte no texto entre colchetes com data, ex: [G1, 03/2026], e liste a URL na seção de Fontes.
- Candidato SEM histórico eleitoral (estreante) é caso esperado: se não houver registro no TSE nem menções políticas, NÃO invente — diga com honestidade que a pegada digital é incipiente, analise o que existir (perfis sociais, atuação profissional/comunitária, presença local) e foque a estratégia em construção de presença e reconhecimento no município.
- Respeite rigorosamente a legislação eleitoral (Lei 9.504/97): jamais sugira compra de voto, caixa dois, desinformação, fake news ou ataques difamatórios. Estratégia ética e propositiva.
- Português do Brasil, tom de consultoria executiva: objetivo, técnico, acionável. Sem floreio de "como IA".
- Números: quando estimar, deixe claro que é estimativa e qual a base. Quando for dado oficial, cite a fonte e o ano.

ESTRUTURE A RESPOSTA EM MARKDOWN com EXATAMENTE estas seções (use ## para títulos):

## 1. Sumário Executivo
3 a 5 bullets com os achados mais críticos e a recomendação central.

## 2. Raio-X do Candidato (Pesquisa Web)
O que a internet diz sobre ${candidateName}. Liste pelo menos 5 menções/registros encontrados (notícia, rede social, site oficial, registro público) com fonte e data. Infira a área de atuação, capital político, vínculos e reputação digital.

## 3. Diagnóstico do Território — ${city}/${state}
Indicadores socioeconômicos oficiais e o que significam politicamente: população e estimativa de eleitorado, evolução do número de eleitores aptos (crescimento entre os últimos pleitos), IDH-M, PIB e principais atividades econômicas, indicadores de saúde/educação/segurança/saneamento, e as dores prioritárias da população. Cite IBGE, TSE, Atlas Brasil, DataSUS quando possível.

## 4. Cenário Eleitoral e Histórico
Resultados das últimas eleições para ${role} em ${city}, principais forças políticas, quociente/votação necessária e janelas de oportunidade. Cruze com os dados do TSE fornecidos quando houver.

## 5. Matriz SWOT Estratégica
Tabela markdown com Forças, Fraquezas, Oportunidades e Ameaças — específicas e fundamentadas nos dados acima, não genéricas.

## 6. Análise Preditiva e Cenários
2 a 3 cenários (pessimista/base/otimista) com a lógica por trás, segmentos de eleitorado decisivos, e gatilhos que movem o resultado.

## 7. Narrativas e Posicionamento
3 narrativas de campanha recomendadas, cada uma com: público-alvo, mensagem central, tom, e canais. Conecte cada narrativa a uma dor real do território identificada na seção 3.

## 8. Plano de Ação (Próximos 90 dias)
Lista priorizada e datada de ações concretas (território, digital, lideranças, agenda), com indicador de sucesso para cada uma.

## 9. Fontes Consultadas
Lista das principais fontes web usadas.`;

    const userPrompt = `Produza a consultoria estratégica completa para a pré-campanha:

- Candidato(a): ${candidateName}${party ? ` (${party})` : ''}
- Cargo pretendido: ${role}
- Município: ${city} — ${stateName} (${state})
${focusAreas ? `- Temas/áreas de interesse declarados: ${focusAreas}` : ''}${electoralContext}

Pesquise na web menções reais ao candidato e os indicadores oficiais do município e do estado. Entregue a consultoria nas 9 seções definidas.`;

    const anthropicRes = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: 8000,
        system: systemPrompt,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 }],
        messages: [{ role: 'user', content: userPrompt }]
      })
    }, 280000);

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      console.error('[Intel Anthropic Error]:', anthropicRes.status, JSON.stringify(data).slice(0, 500));
      if (anthropicRes.status === 401 || anthropicRes.status === 403) {
        return res.status(503).json({
          success: false,
          code: 'AI_NOT_CONFIGURED',
          message:
            'Núcleo de inteligência temporariamente indisponível: a credencial do modelo está ' +
            'inválida ou ausente. Configure uma ANTHROPIC_API_KEY válida no painel da Vercel.'
        });
      }
      const busy = anthropicRes.status === 429 || anthropicRes.status >= 500;
      return res.status(503).json({
        success: false,
        code: busy ? 'AI_UPSTREAM_BUSY' : 'AI_ERROR',
        message: busy
          ? 'Núcleo de inteligência temporariamente sobrecarregado. Tente novamente em alguns instantes.'
          : 'Não foi possível gerar a consultoria no modelo de IA agora.'
      });
    }

    // Concatena os blocos de texto da resposta
    const blocks = data.content || [];
    const report = blocks
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    // Coleta as fontes (URLs) realmente consultadas na busca web
    const sources = [];
    const seen = new Set();
    for (const b of blocks) {
      // resultados de web_search
      if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
        for (const r of b.content) {
          if (r.url && !seen.has(r.url)) {
            seen.add(r.url);
            sources.push({ title: r.title || r.url, url: r.url });
          }
        }
      }
      // citações embutidas no texto
      if (b.type === 'text' && Array.isArray(b.citations)) {
        for (const c of b.citations) {
          const url = c.url || c.source;
          if (url && !seen.has(url)) {
            seen.add(url);
            sources.push({ title: c.title || url, url });
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      report,
      sources,
      generatedAt: new Date().toISOString(),
      candidate: { candidateName, party, role, city, state },
      usage: data.usage || null
    });
  } catch (error) {
    console.error('[API Intel Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Falha interna no núcleo de inteligência.'
    });
  }
}
