/**
 * Vercel Serverless Function: api/assistant.js
 *
 * Assistente de IA ("E-Poliana") em Claude Sonnet 4.6.
 * A API key fica sempre server-side; o frontend só recebe o texto final.
 *
 * Variáveis de ambiente (Vercel):
 *   ANTHROPIC_API_KEY - obrigatório (https://console.anthropic.com/settings/keys)
 *   ANTHROPIC_MODEL   - opcional, default 'claude-sonnet-4-6'
 *
 * Prompt caching:
 *   O system prompt é marcado com `cache_control: { type: 'ephemeral' }`.
 *   Como ele só varia por candidato/cidade/cargo, requisições subsequentes
 *   do MESMO usuário em ≤5min reutilizam o cache (≥90% mais barato).
 *   Para maximizar hit rate, mantenha a ordem dos campos do contexto estável.
 */

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_HISTORY = 20;

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

    const systemPrompt = `Você é a E-Poliana, estrategista política sênior com inteligência artificial da plataforma brasileira e-politica.ia.

Contexto da campanha do usuário:
- Candidato: ${candidateName} ${candidateParty ? `(${candidateParty})` : ''}
- Cargo em disputa: ${role}
- Município: ${city}

Diretrizes:
- Responda sempre em português do Brasil, com tom profissional e estratégico.
- Estruture as respostas em Markdown (títulos ###, listas numeradas, negrito) para facilitar a leitura no painel.
- Dê recomendações táticas concretas de campanha: segmentação geográfica, mobilização de lideranças, comunicação digital, agenda de rua.
- Quando citar números que você não tem como saber, deixe claro que são estimativas e recomende validação com dados oficiais do TSE/TRE.
- Respeite rigorosamente a legislação eleitoral brasileira: nunca sugira compra de votos, caixa dois, desinformação, ataques pessoais ou qualquer prática ilegal (Lei 9.504/97).
- Seja concisa: respostas de no máximo ~400 palavras.`;

    // Keep only the recent turns, mapped to the Anthropic format
    const history = messages.slice(-MAX_HISTORY).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text
    }));

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
        // System como array de blocos para habilitar prompt caching ephemeral.
        // Hit rate alto enquanto contexto do candidato não mudar (5min TTL).
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' }
          }
        ],
        messages: history
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

    const text = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    return res.status(200).json({ success: true, text });
  } catch (error) {
    console.error('[API Assistant Error]:', error);
    return res.status(500).json({ success: false, message: 'Falha interna no assistente IA.' });
  }
}
