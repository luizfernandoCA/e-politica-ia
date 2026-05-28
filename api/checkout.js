/**
 * Vercel Serverless Function: api/checkout.js
 * Simulates Stripe/Mercado Pago card processing, crediting Banco do Brasil
 * (Agência: 1401-X, Conta Corrente: 52678-9).
 */

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId, email, cardName, cardNumber, cardExpiry, amount } = req.body;

    if (!email || !cardNumber || !cardName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Preencha todos os campos obrigatórios do cartão de crédito.' 
      });
    }

    // Simulate 1.5 second processing latency
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const txId = `tx_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

    // Detailed simulation logs
    console.log(`=========================================`);
    console.log(`[PAYMENT LOG] USER SUBSCRIPTION SUCCESSFUL`);
    console.log(`User ID: ${userId}`);
    console.log(`Email: ${email}`);
    console.log(`Amount: R$ ${amount}`);
    console.log(`Card Name: ${cardName}`);
    console.log(`Transaction: ${txId}`);
    console.log(`[BB CREDIT] Deposit completed targeting BB - Ag: 1401-X | CC: 52678-9`);
    console.log(`=========================================`);

    return res.status(200).json({
      success: true,
      transactionId: txId,
      amount: amount,
      timestamp: new Date().toISOString(),
      message: 'Transação aprovada com sucesso via gateway integrado.',
      recipient: {
        bank: 'Banco do Brasil',
        agency: '1401-X',
        account: '52678-9',
        owner: 'e-politica.ia LTDA'
      }
    });

  } catch (error) {
    console.error('[API Checkout Error]:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Falha interna durante o processamento do pagamento no gateway.' 
    });
  }
}
