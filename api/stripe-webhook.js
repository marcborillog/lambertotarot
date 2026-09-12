const Stripe = require('stripe');
const { confirmBooking, cancelBooking } = require('./_lib/calcom');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  let event;
  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Firma de webhook de Stripe inválida', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.payment_status === 'paid' && session.metadata && session.metadata.bookingUid) {
        await confirmBooking(session.metadata.bookingUid);
      }
    } else if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      if (session.metadata && session.metadata.bookingUid) {
        await cancelBooking(session.metadata.bookingUid, 'El pago no se completó a tiempo.');
      }
    }
    res.status(200).json({ received: true });
  } catch (err) {
    // Se responde 200 para que Stripe no reintente en bucle; el caso queda
    // visible en los logs de Vercel y en los paneles de Stripe/Cal.com para revisar a mano.
    console.error('Error procesando el webhook de Stripe', err);
    res.status(200).json({ received: true, warning: 'internal-error' });
  }
}

handler.config = { api: { bodyParser: false } };

module.exports = handler;
