/**
 * Vercel Serverless Function: api/mp-webhook.js
 *
 * Mercado Pago payment notification webhook (IPN / Webhooks v2).
 * When a payment is approved, records it in the `payments` ledger and
 * activates the user's subscription in `user_state.payment_status`,
 * using the Supabase service-role key (bypasses RLS - server only).
 *
 * Required environment variables (Vercel):
 *   MP_ACCESS_TOKEN            - Mercado Pago access token
 *   SUPABASE_URL               - https://tlnprjkiydiogrcsruxw.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  - Supabase Dashboard > Settings > API > service_role
 *   MP_WEBHOOK_SECRET          - (opcional) ativa a validação da assinatura x-signature
 */

import { fetchWithTimeout, verifyMercadoPagoSignature } from '../lib/guard.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL || 'https://tlnprjkiydiogrcsruxw.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!accessToken || !serviceKey) {
    console.error('[MP Webhook] Variáveis de ambiente ausentes (MP_ACCESS_TOKEN / SUPABASE_SERVICE_ROLE_KEY).');
    // Acknowledge to avoid infinite retries while environment is incomplete
    return res.status(200).json({ received: true, processed: false });
  }

  try {
    // Mercado Pago sends either ?type=payment&data.id=... or a JSON body
    const type = req.query?.type || req.body?.type || req.query?.topic || req.body?.topic;
    const paymentId =
      req.query?.['data.id'] ||
      req.body?.data?.id ||
      req.query?.id ||
      req.body?.id;

    if (type !== 'payment' || !paymentId) {
      return res.status(200).json({ received: true, ignored: true });
    }

    // 0. Verificação de assinatura HMAC (defesa em profundidade).
    //    Opt-in: só rejeita se MP_WEBHOOK_SECRET estiver configurado.
    const sig = verifyMercadoPagoSignature(req, paymentId);
    if (sig.configured && !sig.valid) {
      console.warn('[MP Webhook] Assinatura x-signature inválida — rejeitado.');
      return res.status(401).json({ received: true, error: 'invalid signature' });
    }
    if (!sig.configured) {
      console.warn('[MP Webhook] MP_WEBHOOK_SECRET ausente — seguindo só com re-fetch autoritativo.');
    }

    // 1. Fetch the authoritative payment record from Mercado Pago
    const mpRes = await fetchWithTimeout(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    }, 10000);
    if (!mpRes.ok) {
      console.error('[MP Webhook] Falha ao consultar pagamento:', await mpRes.text());
      return res.status(200).json({ received: true, processed: false });
    }
    const payment = await mpRes.json();

    const userId = payment.external_reference; // set during preference creation
    const status = payment.status; // approved | pending | rejected | ...

    const sbHeaders = {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'resolution=merge-duplicates,return=minimal'
    };

    // 2. Record in payments ledger.
    //    `raw` guarda só campos de reconciliação — NÃO o objeto completo do
    //    pagador (LGPD: minimização de dados pessoais).
    await fetchWithTimeout(`${supabaseUrl}/rest/v1/payments`, {
      method: 'POST',
      headers: sbHeaders,
      body: JSON.stringify({
        user_id: userId || null,
        email: payment.payer?.email || null,
        provider: 'mercadopago',
        provider_payment_id: String(payment.id),
        amount: payment.transaction_amount,
        currency: payment.currency_id || 'BRL',
        status,
        raw: {
          id: payment.id,
          status: payment.status,
          status_detail: payment.status_detail,
          transaction_amount: payment.transaction_amount,
          currency_id: payment.currency_id,
          date_approved: payment.date_approved,
          payment_method_id: payment.payment_method_id,
          payment_type_id: payment.payment_type_id,
          external_reference: payment.external_reference
        }
      })
    }, 8000);

    // 3. Activate subscription when approved
    if (status === 'approved' && userId) {
      await fetchWithTimeout(`${supabaseUrl}/rest/v1/user_state?on_conflict=user_id`, {
        method: 'POST',
        headers: sbHeaders,
        body: JSON.stringify({
          user_id: userId,
          payment_status: {
            status: 'active',
            provider: 'mercadopago',
            paymentId: String(payment.id),
            amount: payment.transaction_amount,
            activatedAt: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
      }, 8000);
    }

    return res.status(200).json({ received: true, processed: true, status });
  } catch (error) {
    console.error('[MP Webhook Error]:', error);
    return res.status(200).json({ received: true, processed: false });
  }
}
