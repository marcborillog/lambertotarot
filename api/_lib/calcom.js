const CALCOM_API = 'https://api.cal.com/v2';

async function calcomFetch(path, options = {}) {
  const res = await fetch(`${CALCOM_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.CALCOM_API_KEY}`,
      'cal-api-version': '2024-08-13',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cal.com API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function getBooking(uid) {
  const data = await calcomFetch(`/bookings/${uid}`);
  return data.data;
}

async function confirmBooking(uid) {
  return calcomFetch(`/bookings/${uid}/confirm`, { method: 'POST' });
}

async function cancelBooking(uid, reason) {
  return calcomFetch(`/bookings/${uid}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ cancellationReason: reason || 'Pago no completado' }),
  });
}

module.exports = { getBooking, confirmBooking, cancelBooking };
