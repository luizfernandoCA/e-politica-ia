/**
 * Vercel Serverless Function: api/checkout.js
 *
 * REAL payment integration via Mercado Pago Checkout Pro.
 * Creates a payment preference server-side and returns the `init_point`
 * URL where the user completes payment inside Mercado Pago's PCI-compliant
 * environment. O Pix também é recebido VIA Mercado Pago (decisão de produto):
 * a ativação da assinatura permanece automática via webhook; o repasse para a
 * conta bancária é feito por saque no painel do Mercado Pago. Nenhum dado
 * bancário pessoal (chave Pix/CPF/conta) trafega ou é versionado.
 *
 * Pacote único "Estrategista":
 *   - Cartão: R$ 990,00 em até 3x.
 *   - Pix à vista: R$ 841,50 (15% de desconto).
 * O PREÇO é definido no servidor a partir de `method` ('card' | 'pix');
 * o cliente nunca informa o valor (anti-adulteração).
 *
 * Required environment variable (Vercel > Settings > Environment Variables):
 *   MP_ACCESS_TOKEN  - Mercado Pago access token
 *                      (https://www.mercadopago.com.br/developers/panel/app
 *                       > Suas integrações > Credenciais de produção)
 * Optional:
 *   APP_URL          - public URL of the app (defaults to the request origin)
 */

import { applyCors, verifyUser, unauthorized, fetchWithTimeout } from '../lib/guard.js';

const PACKAGE_PRICE = 990.0;       // preço cheio (cartão)
const PIX_DISCOUNT = 0.15;         // 15% à vista no Pix
const PIX_PRICE = Math.round(PACKAGE_PRICE * (1 - PIX_DISCOUNT) * 100) / 100; // 841.50
const MAX_INSTALLMENTS = 3;        // 3x no cartão

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  // Identidade vem do JWT validado, NÃO do corpo: impede creditar a
  // assinatura a um userId arbitrário (confused-deputy).
  const user = await verifyUser(req);
  if (!user) return unauthorized(res);

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
    // userId e email são os do usuário autenticado (fonte autoritativa).
    const userId = user.id;
    const email = user.email || (req.body && req.body.email);
    const name = req.body?.name;
    if (!email) {
      return res.status(400).json({ success: false, message: 'E-mail da conta indisponível.' });
    }

    // Método vem do cliente; o PREÇO é definido aqui no servidor.
    const method = req.body?.method === 'pix' ? 'pix' : 'card';
    const isPix = method === 'pix';
    const unitPrice = isPix ? PIX_PRICE : PACKAGE_PRICE;

    // Restringe os meios de pagamento conforme o caminho escolhido.
    // Pix = payment_type "bank_transfer"; boleto = "ticket".
    const paymentMethods = isPix
      ? {
          // Só Pix: exclui cartões/boleto/atm.
          excluded_payment_types: [
            { id: 'credit_card' },
            { id: 'debit_card' },
            { id: 'prepaid_card' },
            { id: 'ticket' },
            { id: 'atm' }
          ],
          installments: 1
        }
      : {
          // Só cartão (até 3x): exclui Pix/boleto/atm.
          excluded_payment_types: [
            { id: 'bank_transfer' },
            { id: 'ticket' },
            { id: 'atm' }
          ],
          installments: MAX_INSTALLMENTS,
          default_installments: MAX_INSTALLMENTS
        };

    const appUrl =
      process.env.APP_URL ||
      `https://${req.headers['x-forwarded-host'] || req.headers.host}`;

    const preference = {
      items: [
        {
          id: 'pacote-estrategista',
          title: isPix
            ? 'e-politica.ia — Pacote Estrategista (Pix à vista, 15% off)'
            : 'e-politica.ia — Pacote Estrategista (até 3x no cartão)',
          description: 'Acesso completo: dashboards eleitorais, CRM, consultoria e assistente IA.',
          category_id: 'services',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: unitPrice
        }
      ],
      payment_methods: paymentMethods,
      metadata: { plan: 'pacote-estrategista', method, list_price: PACKAGE_PRICE },
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

    const mpResponse = await fetchWithTimeout('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(preference)
    }, 10000);

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
      method,
      amount: unitPrice,
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
