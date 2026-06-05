// paypalService.js — Variables leídas en tiempo de ejecución, no de importación
const PAYPAL_BASE = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

// ❌ ANTES (bug): se leían al importar el módulo, antes de que dotenv cargara el .env
// const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
// const SECRET = process.env.PAYPAL_SECRET;

// ✅ AHORA: se leen en cada llamada, garantizando que .env ya esté cargado
function getCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret   = process.env.PAYPAL_SECRET;

  if (!clientId || !secret) {
    throw new Error(
      'PayPal no configurado. Falta PAYPAL_CLIENT_ID o PAYPAL_SECRET en variables de entorno.'
    );
  }
  return { clientId, secret };
}

async function getAccessToken() {
  const { clientId, secret } = getCredentials();
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');

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
    throw new Error(
      'No se pudo obtener token PayPal: ' + JSON.stringify(data)
    );
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
          value: parseFloat(total).toFixed(2)
        },
        description: 'Compra EcoVida'
      }]
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data.details?.[0]?.description || data.message || 'Error al crear orden en PayPal'
    );
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
    throw new Error(
      data.details?.[0]?.description || data.message || 'Error al capturar orden en PayPal'
    );
  }
  return data;
}

module.exports = { crearOrdenPayPal, capturarOrdenPayPal };
