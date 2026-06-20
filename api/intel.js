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
      politicalName = '',
      party = '',
      role = 'Deputado Estadual',
      currentRole = '',
      city = '',
      state = '',
      previousRole = '',
      previousYear = '',
      coligacao = '',
      context = '',
      focusAreas = '',
      electoralData = null
    } = req.body || {};

    if (!candidateName || (!city && !state)) {
      return res.status(400).json({
        success: false,
        message: 'candidateName e (city ou state) são obrigatórios.'
      });
    }
    // Limites de input: barra payloads gigantes que inflam tokens / custo.
    if (
      tooLong(candidateName, 120) || tooLong(city, 120) || tooLong(party, 80) ||
      tooLong(role, 80) || tooLong(focusAreas, 1200) || tooLong(context, 3000) ||
      tooLong(coligacao, 200) || tooLong(currentRole, 160)
    ) {
      return res.status(413).json({ success: false, message: 'Parâmetros longos demais.' });
    }

    const stateName = state === 'RO' ? 'Rondônia' : state;

    const electoralContext = electoralData
      ? `\n\nDADOS ELEITORAIS JÁ COLETADOS (TSE) PARA CONTEXTO:\n${JSON.stringify(electoralData).slice(0, 4000)}`
      : '';

    const localLabel = city ? `${city}/${state || 'BR'}` : (stateName || 'Brasil');
    const systemPrompt = `Você é a E-Poliana, estrategista política sênior de inteligência de dados, 20 anos em campanhas eleitorais brasileiras. Você produz a "PROJEÇÃO ESTRATÉGICA" — o relatório de pré-campanha mais completo e profissional do mercado, equivalente ao de grandes institutos, fundamentado em DADOS REAIS pesquisados na web e em cálculo eleitoral correto, nunca em achismo. O relatório vale para QUALQUER cargo e QUALQUER estado do Brasil.

REGRAS DE OURO (inegociáveis):
- BUSCA WEB AGRESSIVA E INTELIGENTE: faça múltiplas buscas para (a) menções ao candidato em NOTÍCIAS e REDES SOCIAIS (Instagram, Facebook, X, TikTok, YouTube, LinkedIn) com métricas se possível; (b) histórico eleitoral oficial do candidato (TSE/divulgacand, votos e colocação); (c) indicadores do território (IBGE: população, eleitorado, IDH, PIB; saúde/educação/segurança); (d) contexto e adversários do pleito de 2026.
- PRIORIZE 2025-2026 e inclua DATA em cada menção. Foco: eleição geral de outubro/2026.
- TODA afirmação factual relevante vem de FONTE REAL E VERIFICÁVEL (link conferível no Google), citada no texto entre colchetes com data, ex: [G1, 03/2026], e listada na seção Fontes.
- ESTIMATIVA vs DADO: rotule explicitamente toda projeção como "(estimativa)" e diga a base de cálculo. Dado oficial → cite fonte e ano. NÃO invente números, cadeiras, votações ou leis.
- COEFICIENTE ELEITORAL: para cargos PROPORCIONAIS (Deputado Federal/Estadual, Vereador) use QE = votos válidos ÷ nº de vagas (despreza fração ≤0,5; sobe se >0,5); votos válidos = nominais + legenda. Para MAJORITÁRIOS (Senador, Governador, Prefeito, Presidente) NÃO há coeficiente — explique o limiar de maioria (Senado 2026 = 2 vagas/estado, 2 mais votados; Governador = maioria absoluta, 2º turno). ATENÇÃO: a distribuição de cadeiras de Deputado Federal por estado para 2026 está EM DEFINIÇÃO (projeto 513→531 + Censo 2022) — diga isso e oriente confirmar no TSE; derive a bancada estadual pela fórmula da CF art. 27 quando aplicável.
- ESTREANTE (sem histórico): caso esperado e legítimo. Não invente passado; analise pegada digital, atuação profissional/comunitária e foque em construção de presença.
- LEGALIDADE: respeite a Lei 9.504/97 e resoluções do TSE; jamais sugira compra de voto, caixa dois, desinformação, fake news ou ataque difamatório. Estratégia ética e propositiva.
- Português do Brasil, tom de consultoria executiva — objetivo, técnico, acionável, sem floreio de "como IA". Use tabelas markdown onde fizer sentido.

ESTRUTURE EM MARKDOWN com ESTAS seções (use ## para títulos; tabelas onde indicado):

## 1. Sumário Executivo
3-5 bullets com o veredito central, a classificação de viabilidade e a recomendação-mãe.

## 2. Perfil e Trajetória Política
Quem é ${politicalName || candidateName}: cargos exercidos, base territorial, vínculos, momento atual. Use o contexto declarado + a busca web.

## 3. Histórico Eleitoral Detalhado
Tabela: | Ano | Cargo | Votos | % válidos | Colocação | Observações |. Inclua o que a busca/TSE trouxer; se estreante, declare.

## 4. Score de Viabilidade (0-100)
Tabela transparente com 5 critérios e pontos: Base territorial (0-25), Presença política/histórico (0-25), Força do partido/coligação (0-20), Potencial de expansão (0-20), Presença digital (0-10). Some o TOTAL e dê a classificação: Inviável (0-24) · Desafiador (25-49) · Competitivo (50-74) · Favorito (75-100). Justifique cada nota.

## 5. Coeficiente Eleitoral e Metas
Para o cargo pretendido (${role}): se proporcional, calcule QE e as metas — Meta mínima (último eleito), Meta segura (≈ QE), Meta de liderança (≈ 1,5× a média) — com a projeção de votos válidos e o nº de vagas (declare a base e que é estimativa). Se majoritário, dê o limiar de maioria e os votos de referência. Mostre o GAP entre os votos históricos do candidato e a meta.

## 6. Caminho Matemático da Vitória
Tabela de origem dos votos: base atual, seções/territórios mobilizáveis, novos territórios → total projetado vs meta segura. Explique cada origem.

## 7. Mapa de Força Territorial
Tabela por região/zona/município: força (forte/média/baixa), votos históricos se houver, e observação. Aponte redutos próprios e adversários.

## 8. Força Partidária e Coligação
Situação do partido ${party || '(informado)'} ${coligacao ? `e da coligação ${coligacao}` : ''} no estado: eleitos recentes, tendência, e o que a coligação agrega.

## 9. Radar de Adversários
Tabela: | Adversário | Base eleitoral | Pontos fortes | Nível de risco |. Identifique nomes reais via busca quando possível.

## 10. Cenários (Pessimista / Realista / Otimista)
Tabela com descrição, votos estimados e resultado esperado em cada cenário.

## 11. Estratégia Territorial
Prioridades (Garantir / Expandir / Explorar) com ação e objetivo.

## 12. Presença Digital
Métricas reais encontradas (seguidores, engajamento, conteúdo) e recomendações.

## 13. Riscos Políticos e Mitigação
Tabela: | Risco | Probabilidade | Impacto | Mitigação |.

## 14. Recomendações de Campanha
Lista priorizada e acionável.

## 15. Timeline da Campanha
Tabela por fase (até o pleito de out/2026): período, foco e ações-chave.

## 16. Fontes Consultadas
Lista das URLs reais usadas (verificáveis).`;

    const userPrompt = `Produza a PROJEÇÃO ESTRATÉGICA completa para a pré-campanha 2026:

- Candidato(a): ${candidateName}${politicalName ? ` (urna/político: ${politicalName})` : ''}${party ? ` — ${party}` : ''}
- Cargo pretendido (2026): ${role}
- Local: ${localLabel}${currentRole ? `\n- Cargo/função atual: ${currentRole}` : ''}${previousRole ? `\n- Candidatura anterior declarada: ${previousRole}${previousYear ? ` em ${previousYear}` : ''}` : '\n- Sem candidatura anterior declarada (estreante)'}${coligacao ? `\n- Coligação prevista: ${coligacao}` : ''}${context ? `\n- Trajetória/contexto declarado: ${context}` : ''}${focusAreas ? `\n- Temas/áreas de interesse: ${focusAreas}` : ''}${electoralContext}

Pesquise na web (notícias + redes sociais + dados oficiais) e entregue TODAS as 16 seções, com fontes verificáveis citadas e estimativas rotuladas.`;

    const anthropicRes = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
        max_tokens: 14000,
        system: systemPrompt,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 10 }],
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
