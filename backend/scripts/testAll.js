import crypto from 'crypto';

const BASE = 'http://localhost:5001';

async function safeFetch(url, opts) {
  const response = await fetch(url, opts);
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: response.status, headers: response.headers, body };
}

async function run() {
  console.log('Testing backend at', BASE);

  const health = await safeFetch(`${BASE}/api/health`);
  console.log('Health:', health.status, health.body?.status || 'no status');

  const docs = await safeFetch(`${BASE}/api/docs`);
  console.log('Docs:', docs.status, typeof docs.body === 'string' ? 'html response' : docs.body);

  const csrfRes = await fetch(`${BASE}/api/csrf-token`, { method: 'GET' });
  const csrfText = await csrfRes.text();
  const setCookie = csrfRes.headers.get('set-cookie');
  let csrfBody;
  try { csrfBody = JSON.parse(csrfText); } catch { csrfBody = csrfText; }
  console.log('CSRF token endpoint:', csrfRes.status, csrfBody);
  console.log('CSRF set-cookie:', setCookie ? 'present' : 'missing');

  const webhookBody = JSON.stringify({
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'test-payment', amount: 100 } } }
  });

  const webhookSig = crypto.createHmac('sha256', 'webhook-test-123').update(webhookBody).digest('hex');
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac('sha256', 'sign-test-123').update(`${timestamp}.${webhookBody}`).digest('hex');

  const webhook = await safeFetch(`${BASE}/api/payments/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': webhookSig,
      'X-Timestamp': String(timestamp),
      'X-Signature': signature
    },
    body: webhookBody
  });

  console.log('Webhook test:', webhook.status, webhook.body);
}

run().catch((error) => {
  console.error('Test script failed:', error);
  process.exit(1);
});
