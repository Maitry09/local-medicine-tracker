import express from 'express';
import {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
  getPaymentDetails,
  getUserPayments,
  refundPayment,
  getPaymentConfig
} from '../controllers/payment.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { mongoIdValidation, validate } from '../middleware/validation.middleware.js';

const router = express.Router();

// Webhook route (no auth, has its own signature verification)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Protected routes
router.post('/create-order', authMiddleware, createPaymentOrder);
router.post('/verify', authMiddleware, verifyPayment);
router.get('/details/:paymentId', authMiddleware, mongoIdValidation('paymentId'), validate, getPaymentDetails);
router.get('/user/all', authMiddleware, getUserPayments);
router.post('/refund', authMiddleware, refundPayment);
router.get('/config', getPaymentConfig);

export default router;
