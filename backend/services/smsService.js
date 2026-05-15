import { Buffer } from 'buffer';

export async function sendSms({ to, body }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio SMS provider is not configured');
  }

  if (!to) {
    throw new Error('Destination phone number is required');
  }

  if (!body) {
    throw new Error('SMS body is required');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const payload = new URLSearchParams({
    To: to,
    From: fromNumber,
    Body: body,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || `Twilio SMS error: ${response.status}`);
  }

  return json;
}
