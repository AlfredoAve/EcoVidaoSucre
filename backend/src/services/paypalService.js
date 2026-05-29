const PAYPAL_BASE = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const SECRET = process.env.PAYPAL_SECRET;

async function getAccessToken() {
  const auth = Buffer.from(`${CLIENT_ID}:${SECRET}`).toString('base64');

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('No se pudo obtener token PayPal: ' + JSON.stringify(data));
  }
  return data.access_token;
}

async function crearOrdenPayPal(total, moneda = 'USD') {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: moneda,
          value: Number(total).toFixed(2).toString()
        },
        description: 'Compra EcoVida'
      }]
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.details?.[0]?.description || data.message || 'Error al crear orden en PayPal');
  }
  return data;
}

async function capturarOrdenPayPal(paypalOrderId) {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.details?.[0]?.description || data.message || 'Error al capturar orden en PayPal');
  }
  return data;
}

module.exports = { crearOrdenPayPal, capturarOrdenPayPal };
