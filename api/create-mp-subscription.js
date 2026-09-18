export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
      const { salonId, email, salonName } = req.body;
      const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  
      const response = await fetch('https://api.mercadopago.com/preapproval', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: `Assinatura GlowAgenda - ${salonName || 'Salão'}`,
          external_reference: salonId,
          payer_email: email,
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: 69.90,
            currency_id: 'BRL'
          },
          back_url: `${req.headers.origin || 'https://seu-app.vercel.app'}/painel`,
          status: 'pending'
        })
      });
  
      const data = await response.json();
      return res.status(200).json({ init_point: data.init_point });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }