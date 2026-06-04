/**
 * Vercel Serverless Function: api/checkout.js
 *
 * REAL payment integration via Mercado Pago Checkout Pro.
 * Creates a payment preference server-side and returns the `init_point`
 * URL where the user completes payment (Pix, card, boleto) inside
 * Mercado Pago's PCI-compliant environment.
 *
 * Required environment variable (Vercel > Settings > Environment Variables):
 *   MP_ACCESS_TOKEN  - Mercado Pago access token
 *                      (https://www.mercadopago.com.br/developers/panel/app
 *                       > Suas integrações > Credenciais de produção)
 * Optional:
 *   APP_URL          - public URL of the app (defaults to the request origin)
 */

const PLAN_PRICE = 99.90;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(503).json({
      success: false,
      code: 'GATEWAY_NOT_CONFIGURED',
      message:
        'Gateway de pagamento não configurado. Defina a variável de ambiente MP_ACCESS_TOKEN ' +
        '(Mercado Pago > Suas integrações > Credenciais) no painel da Vercel.'
    });
  }

  try {
    const { userId, email, name } = req.body || {};
    if (!userId || !email) {
      return res.status(400).json({ success: false, message: 'userId e email são obrigatórios.' });
    }

    const appUrl =
      process.env.APP_URL ||
      `https://${req.headers['x-forwarded-host'] || req.headers.host}`;

    const preference = {
      items: [
        {
          id: 'plano-estrategista-pro',
          title: 'e-politica.ia — Plano Estrategista Pro (assinatura mensal)',
          description: 'Acesso completo: dashboards eleitorais, CRM e assistente IA.',
          category_id: 'services',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: PLAN_PRICE
        }
      ],
      payer: { email, name: name || undefined },
      external_reference: userId,
      back_urls: {
        success: `${appUrl}/?payment=success`,
        failure: `${appUrl}/?payment=failure`,
        pending: `${appUrl}/?payment=pending`
      },
      auto_return: 'approved',
      notification_url: `${appUrl}/api/mp-webhook`,
      statement_descriptor: 'EPOLITICA.IA'
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(preference)
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('[MP Preference Error]:', data);
      return res.status(502).json({
        success: false,
        message: data.message || 'O Mercado Pago rejeitou a criação da preferência de pagamento.'
      });
    }

    return res.status(200).json({
      success: true,
      preferenceId: data.id,
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point
    });
  } catch (error) {
    console.error('[API Checkout Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Falha interna ao criar a preferência de pagamento.'
    });
  }
}
