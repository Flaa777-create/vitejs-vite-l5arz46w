import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  try {
    const body = req.body;
    const topic = body.type || body.action;
    const resourceId = body.data?.id;

    if (!resourceId) return res.status(200).json({ ok: true });

    const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    if (topic?.includes('subscription') || body.type === 'subscription_preapproval') {
      const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${resourceId}`, {
        headers: { Authorization: `Bearer ${mpAccessToken}` }
      });
      const subData = await mpRes.json();
      
      const statusMap = {
        'authorized': 'active',
        'pending': 'pending',
        'paused': 'past_due',
        'cancelled': 'expired',
        'expired': 'expired'
      };

      const newStatus = statusMap[subData.status] || 'past_due';
      const externalRef = subData.external_reference;

      if (externalRef) {
        await supabase
          .from('salons')
          .update({ 
            subscription_status: newStatus,
            mp_subscription_id: String(resourceId)
          })
          .eq('owner_id', externalRef);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}