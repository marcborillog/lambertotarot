const Stripe = require('stripe');
const { cancelBooking } = require('./_lib/calcom');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  const { bookingUid, session_id: sessionId } = req.query;

  try {
    if (sessionId) {
      // Cierra la Checkout Session ya mismo en vez de esperar a que expire sola.
      await stripe.checkout.sessions.expire(sessionId).catch(() => {});
    }
    if (bookingUid) {
      await cancelBooking(bookingUid, 'El cliente canceló el pago.');
    }
  } catch (err) {
    console.error('Error liberando la reserva tras cancelar el pago', err);
  }

  res.writeHead(302, { Location: '/pago-cancelado.html' });
  res.end();
};
