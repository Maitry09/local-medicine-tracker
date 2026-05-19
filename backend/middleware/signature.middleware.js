import crypto from 'crypto';
import logger from '../utils/logger.js';

const WINDOW_SECONDS = parseInt(process.env.SIGNATURE_TTL || '300', 10); // 5 minutes default

export function verifyRequestSignature(req, res, next) {
  const secret = process.env.SIGNING_SECRET;
  if (!secret) {
    logger.warn('[Signature] SIGNING_SECRET not set - skipping verification');
    return next();
  }

  const signature = (req.headers['x-signature'] || '').toString();
  const timestamp = (req.headers['x-timestamp'] || '').toString();

  if (!signature || !timestamp) {
    return res.status(401).json({ success: false, message: 'Missing signature headers' });
  }

  const ts = parseInt(timestamp, 10);
  if (Number.isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > WINDOW_SECONDS) {
    return res.status(401).json({ success: false, message: 'Invalid or expired timestamp' });
  }

  const payload = req.rawBody
    ? req.rawBody
    : Buffer.isBuffer(req.body)
      ? req.body
      : (req.body ? JSON.stringify(req.body) : '');
  const computed = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');

  try {
    const sigBuf = Buffer.from(signature, 'hex');
    const compBuf = Buffer.from(computed, 'hex');
    if (sigBuf.length !== compBuf.length || !crypto.timingSafeEqual(sigBuf, compBuf)) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }
  } catch (err) {
    logger.warn('[Signature] verification failed', err.message);
    return res.status(401).json({ success: false, message: 'Signature verification failed' });
  }

  return next();
}

export function signPayload(payload, timestamp = Math.floor(Date.now() / 1000)) {
  const secret = process.env.SIGNING_SECRET;
  if (!secret) throw new Error('SIGNING_SECRET not set');
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return { signature, timestamp };
}

export default verifyRequestSignature;
