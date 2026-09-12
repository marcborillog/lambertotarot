const Stripe = require('stripe');
const { getBooking } = require('./_lib/calcom');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const DURACIONES_VALIDAS = new Set([10, 15, 30, 45, 60]);

module.exports = async (req, res) => {
  try {
    const { bookingUid, duration } = req.query;
    const minutos = parseInt(duration, 10);

    if (!bookingUid || !DURACIONES_VALIDAS.has(minutos)) {
      res.status(400).send('Falta la reserva o la duración no es válida.');
      return;
    }

    let booking;
    try {
      booking = await getBooking(bookingUid);
    } catch (err) {
      console.error('No se pudo obtener la reserva de Cal.com', err);
      res.status(404).send('No hemos encontrado esa reserva. Vuelve a intentarlo desde la web.');
      return;
    }

    if (booking.status !== 'pending') {
      res.writeHead(302, { Location: '/reserva-no-disponible.html' });
      res.end();
      return;
    }

    const attendee = (booking.attendees && booking.attendees[0]) || {};
    const siteUrl = `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'bizum'],
      customer_email: attendee.email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: minutos * 100,
            product_data: { name: `Consulta de tarot — ${minutos} min` },
          },
          quantity: 1,
        },
      ],
      metadata: { bookingUid, duration: String(minutos) },
      expires_at: Math.floor(Date.now() / 1000) + 35 * 60,
      success_url: `${siteUrl}/pago-confirmado.html?bookingUid=${bookingUid}`,
      cancel_url: `${siteUrl}/api/cancelar-pago?bookingUid=${bookingUid}&session_id={CHECKOUT_SESSION_ID}`,
    });

    res.writeHead(302, { Location: session.url });
    res.end();
  } catch (err) {
    console.error('Error creando el pago', err);
    res.status(500).send('No se ha podido iniciar el pago. Inténtalo de nuevo en unos minutos.');
  }
};
