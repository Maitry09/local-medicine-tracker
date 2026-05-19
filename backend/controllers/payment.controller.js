import Razorpay from 'razorpay';
import crypto from 'crypto';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

let razorpay;
try {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  logger.info('✅ Razorpay initialized successfully');
} catch (error) {
  logger.error('❌ Razorpay initialization failed:', error.message);
}

export const createPaymentOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  logger.info('📝 Creating payment order for:', orderId);

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return sendError(res, 500, 'Razorpay is not configured. Please contact administrator.');
  }

  const order = await Order.findById(orderId);
  if (!order) return sendError(res, 404, 'Order not found');

  if (order.userId.toString() !== req.userId.toString() && req.userRole !== 'admin') {
    return sendError(res, 403, 'Access denied. This is not your order.');
  }

  if (order.paymentStatus === 'paid') return sendError(res, 400, 'This order has already been paid');

  const existingPayment = await Payment.findOne({ orderId: order._id, status: 'completed' });
  if (existingPayment) return sendError(res, 400, 'Payment already completed for this order');

  try {
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.totalAmount * 100),
      currency: 'INR',
      receipt: `order_${order._id}`,
      notes: { orderId: order._id.toString(), userId: req.userId.toString(), userEmail: req.user.email }
    });

    logger.info('✅ Razorpay order created:', razorpayOrder.id);

    const payment = await Payment.create({
      orderId: order._id,
      userId: req.userId,
      amount: order.totalAmount,
      currency: 'INR',
      razorpayOrderId: razorpayOrder.id,
      status: 'pending'
    });

    order.paymentId = payment._id;
    order.paymentStatus = 'pending';
    await order.save();

    logger.info('✅ Payment record created:', payment._id);

    sendSuccess(res, 201, {
      razorpayOrder: { id: razorpayOrder.id, amount: razorpayOrder.amount, currency: razorpayOrder.currency },
      payment: { id: payment._id, amount: payment.amount, status: payment.status },
      key: process.env.RAZORPAY_KEY_ID
    }, 'Payment order created successfully');
  } catch (error) {
    logger.error('❌ Razorpay order creation error:', error.message);
    return sendError(res, 500, `Payment order creation failed: ${error.message}`);
  }
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  logger.info('🔍 Verifying payment:', { razorpay_order_id, razorpay_payment_id });

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return sendError(res, 400, 'Missing payment verification data');
  }

  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest('hex');
  const isValid = expectedSignature === razorpay_signature;

  if (!isValid) {
    logger.error('❌ Invalid payment signature');
    return sendError(res, 400, 'Invalid payment signature. Payment verification failed.');
  }

  logger.info('✅ Payment signature verified');

  const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
  if (!payment) return sendError(res, 404, 'Payment record not found');
  if (payment.status === 'completed') return sendError(res, 400, 'Payment already verified');

  payment.razorpayPaymentId = razorpay_payment_id;
  payment.razorpaySignature = razorpay_signature;
  payment.status = 'completed';
  payment.paidAt = new Date();
  await payment.save();

  logger.info('✅ Payment record updated');

  const order = await Order.findById(payment.orderId);
  if (order) {
    order.paymentStatus = 'paid';
    order.status = 'confirmed';
    order.paidAt = new Date();
    await order.save();
    logger.info('✅ Order status updated to confirmed');
  }

  sendSuccess(res, 200, {
    payment: { id: payment._id, status: payment.status, amount: payment.amount, paidAt: payment.paidAt },
    order: order ? { id: order._id, status: order.status, paymentStatus: order.paymentStatus } : null
  }, 'Payment verified successfully');
});

export const handleWebhook = asyncHandler(async (req, res) => {
  logger.info('🔔 Webhook received from Razorpay');

  const signature = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('❌ Webhook secret not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : (Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body));
  const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

  if (signature !== expectedSignature) {
    logger.error('❌ Invalid webhook signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let parsedBody;
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : {};
  } catch (parseError) {
    logger.error('❌ Failed to parse webhook body', parseError.message);
    return res.status(400).json({ error: 'Invalid webhook payload' });
  }

  const event = parsedBody.event;
  const payloadData = parsedBody.payload?.payment?.entity;
  logger.info('📨 Webhook event:', event);

  try {
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(payloadData);
        break;
      case 'payment.failed':
        await handlePaymentFailed(payloadData);
        break;
      case 'payment.authorized':
        logger.info('💰 Payment authorized:', payloadData?.id);
        break;
      default:
        logger.info('ℹ️  Unhandled webhook event:', event);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    logger.error('❌ Webhook processing error:', error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handlePaymentCaptured(paymentData) {
  logger.info('✅ Processing payment.captured:', paymentData?.id);

  const payment = await Payment.findOne({ razorpayPaymentId: paymentData?.id });
  if (payment) {
    payment.status = 'completed';
    payment.paidAt = new Date();
    await payment.save();

    const order = await Order.findById(payment.orderId);
    if (order) {
      order.paymentStatus = 'paid';
      order.status = 'confirmed';
      order.paidAt = new Date();
      await order.save();
      logger.info('✅ Order confirmed via webhook:', order._id);
    }
  } else {
    logger.warn('⚠️  Payment record not found for:', paymentData?.id);
  }
}

async function handlePaymentFailed(paymentData) {
  logger.error('❌ Processing payment.failed:', paymentData?.id);

  const payment = await Payment.findOne({ razorpayPaymentId: paymentData?.id });
  if (payment) {
    payment.status = 'failed';
    payment.failureReason = paymentData?.error_description || 'Payment failed';
    await payment.save();

    const order = await Order.findById(payment.orderId);
    if (order) {
      order.paymentStatus = 'failed';
      await order.save();
      logger.error('❌ Order marked as failed:', order._id);
    }
  } else {
    logger.warn('⚠️  Payment record not found for failed payment:', paymentData?.id);
  }
}

export const getPaymentDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payment = await Payment.findById(id).populate('orderId').populate('userId', 'name email phone');
  if (!payment) return sendError(res, 404, 'Payment not found');
  if (payment.userId._id.toString() !== req.userId.toString() && req.userRole !== 'admin') return sendError(res, 403, 'Access denied');
  sendSuccess(res, 200, { payment }, 'Payment details retrieved');
});

export const getUserPayments = asyncHandler(async (req, res) => {
  const userId = req.userRole === 'admin' && req.query.userId ? req.query.userId : req.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const payments = await Payment.find({ userId }).populate('orderId', 'orderNumber status totalAmount').sort({ createdAt: -1 }).limit(limit).skip(skip);
  const total = await Payment.countDocuments({ userId });

  sendSuccess(res, 200, { payments, pagination: { total, page, pages: Math.ceil(total / limit), limit } }, 'Payments retrieved successfully');
});

export const refundPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, reason } = req.body;
  const payment = await Payment.findById(id);
  if (!payment) return sendError(res, 404, 'Payment not found');
  if (payment.status !== 'completed') return sendError(res, 400, 'Only completed payments can be refunded');
  if (payment.status === 'refunded') return sendError(res, 400, 'Payment has already been refunded');

  try {
    const refundAmount = amount ? Math.round(amount * 100) : undefined;
    const refund = await razorpay.payments.refund(payment.razorpayPaymentId, { amount: refundAmount, notes: { reason: reason || 'Refund requested by admin', adminId: req.userId.toString() } });
    logger.info('✅ Refund created in Razorpay:', refund.id);

    payment.status = 'refunded';
    payment.refundId = refund.id;
    payment.refundedAt = new Date();
    payment.refundAmount = amount || payment.amount;
    payment.refundReason = reason;
    await payment.save();

    const order = await Order.findById(payment.orderId);
    if (order) {
      order.paymentStatus = 'refunded';
      order.status = 'cancelled';
      await order.save();
      logger.info('✅ Order cancelled due to refund:', order._id);
    }

    sendSuccess(res, 200, { payment, refund: { id: refund.id, amount: refund.amount / 100, status: refund.status } }, 'Refund processed successfully');
  } catch (error) {
    logger.error('❌ Refund processing error:', error.message);
    return sendError(res, 500, `Refund failed: ${error.message}`);
  }
});

export const getPaymentConfig = asyncHandler(async (req, res) => {
  if (!process.env.RAZORPAY_KEY_ID) return sendError(res, 500, 'Payment gateway not configured');
  sendSuccess(res, 200, { key: process.env.RAZORPAY_KEY_ID, currency: 'INR' }, 'Payment configuration retrieved');
});
