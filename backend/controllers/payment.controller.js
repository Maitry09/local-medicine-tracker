import Razorpay from 'razorpay';
import crypto from 'crypto';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/errorHandler.js';
import dotenv from 'dotenv';

// Initialize Razorpay instance
let razorpay;
dotenv.config();

try {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  console.log('✅ Razorpay initialized successfully');
} catch (error) {
  console.error('❌ Razorpay initialization failed:', error.message);
}

/**
 * Create a Razorpay order for payment
 * @route POST /api/payments/create-order
 * @access Private (Patient, Pharmacy, Admin)
 */
export const createPaymentOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  console.log('📝 Creating payment order for:', orderId);

  // Validate Razorpay configuration
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return sendError(res, 500, 'Razorpay is not configured. Please contact administrator.');
  }

  // Get order details
  const order = await Order.findById(orderId);
  
  if (!order) {
    return sendError(res, 404, 'Order not found');
  }

  // Check if user owns this order (or is admin)
  if (order.userId.toString() !== req.userId.toString() && req.userRole !== 'admin') {
    return sendError(res, 403, 'Access denied. This is not your order.');
  }

  // Check if order is already paid
  if (order.paymentStatus === 'paid') {
    return sendError(res, 400, 'This order has already been paid');
  }

  // Check if payment already exists for this order
  const existingPayment = await Payment.findOne({ orderId: order._id, status: 'completed' });
  if (existingPayment) {
    return sendError(res, 400, 'Payment already completed for this order');
  }

  try {
    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.totalAmount * 100), // Convert to paise (1 INR = 100 paise)
      currency: 'INR',
      receipt: `order_${order._id}`,
      notes: {
        orderId: order._id.toString(),
        userId: req.userId.toString(),
        userEmail: req.user.email
      }
    });

    console.log('✅ Razorpay order created:', razorpayOrder.id);

    // Create payment record in our database
    const payment = await Payment.create({
      orderId: order._id,
      userId: req.userId,
      amount: order.totalAmount,
      currency: 'INR',
      razorpayOrderId: razorpayOrder.id,
      status: 'pending'
    });

    // Update order with payment info
    order.paymentId = payment._id;
    order.paymentStatus = 'pending';
    await order.save();

    console.log('✅ Payment record created:', payment._id);

    sendSuccess(res, 201, {
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency
      },
      payment: {
        id: payment._id,
        amount: payment.amount,
        status: payment.status
      },
      key: process.env.RAZORPAY_KEY_ID // Frontend needs this to initialize Razorpay
    }, 'Payment order created successfully');

  } catch (error) {
    console.error('❌ Razorpay order creation error:', error.message);
    return sendError(res, 500, `Payment order creation failed: ${error.message}`);
  }
});

/**
 * Verify payment after Razorpay checkout
 * @route POST /api/payments/verify
 * @access Private
 */
export const verifyPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = req.body;

  console.log('🔍 Verifying payment:', { razorpay_order_id, razorpay_payment_id });

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return sendError(res, 400, 'Missing payment verification data');
  }

  // Verify signature
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest('hex');

  const isValid = expectedSignature === razorpay_signature;

  if (!isValid) {
    console.error('❌ Invalid payment signature');
    return sendError(res, 400, 'Invalid payment signature. Payment verification failed.');
  }

  console.log('✅ Payment signature verified');

  // Find payment record
  const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
  
  if (!payment) {
    return sendError(res, 404, 'Payment record not found');
  }

  // Check if payment already completed
  if (payment.status === 'completed') {
    return sendError(res, 400, 'Payment already verified');
  }

  // Update payment record
  payment.razorpayPaymentId = razorpay_payment_id;
  payment.razorpaySignature = razorpay_signature;
  payment.status = 'completed';
  payment.paidAt = new Date();
  await payment.save();

  console.log('✅ Payment record updated');

  // Update order
  const order = await Order.findById(payment.orderId);
  if (order) {
    order.paymentStatus = 'paid';
    order.status = 'confirmed';
    order.paidAt = new Date();
    await order.save();
    console.log('✅ Order status updated to confirmed');
  }

  sendSuccess(res, 200, {
    payment: {
      id: payment._id,
      status: payment.status,
      amount: payment.amount,
      paidAt: payment.paidAt
    },
    order: {
      id: order._id,
      status: order.status,
      paymentStatus: order.paymentStatus
    }
  }, 'Payment verified successfully');
});

/**
 * Razorpay webhook handler
 * @route POST /api/payments/webhook
 * @access Public (Razorpay webhook)
 */
export const handleWebhook = asyncHandler(async (req, res) => {
  console.log('🔔 Webhook received from Razorpay');

  // Verify webhook signature
  const signature = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('❌ Webhook secret not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.error('❌ Invalid webhook signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = req.body.event;
  const payloadData = req.body.payload.payment.entity;

  console.log('📨 Webhook event:', event);

  try {
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(payloadData);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(payloadData);
        break;
      
      case 'payment.authorized':
        console.log('💰 Payment authorized:', payloadData.id);
        break;
      
      default:
        console.log('ℹ️  Unhandled webhook event:', event);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('❌ Webhook processing error:', error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle payment captured event from webhook
 */
async function handlePaymentCaptured(paymentData) {
  console.log('✅ Processing payment.captured:', paymentData.id);

  const payment = await Payment.findOne({
    razorpayPaymentId: paymentData.id
  });

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
      console.log('✅ Order confirmed via webhook:', order._id);
    }
  } else {
    console.warn('⚠️  Payment record not found for:', paymentData.id);
  }
}

/**
 * Handle payment failed event from webhook
 */
async function handlePaymentFailed(paymentData) {
  console.log('❌ Processing payment.failed:', paymentData.id);

  const payment = await Payment.findOne({
    razorpayPaymentId: paymentData.id
  });

  if (payment) {
    payment.status = 'failed';
    payment.failureReason = paymentData.error_description || 'Payment failed';
    await payment.save();

    const order = await Order.findById(payment.orderId);
    if (order) {
      order.paymentStatus = 'failed';
      await order.save();
      console.log('❌ Order marked as failed:', order._id);
    }
  } else {
    console.warn('⚠️  Payment record not found for failed payment:', paymentData.id);
  }
}

/**
 * Get payment details by ID
 * @route GET /api/payments/details/:id
 * @access Private
 */
export const getPaymentDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const payment = await Payment.findById(id)
    .populate('orderId')
    .populate('userId', 'name email phone');

  if (!payment) {
    return sendError(res, 404, 'Payment not found');
  }

  // Check access: user must own the payment or be admin
  if (
    payment.userId._id.toString() !== req.userId.toString() &&
    req.userRole !== 'admin'
  ) {
    return sendError(res, 403, 'Access denied');
  }

  sendSuccess(res, 200, { payment }, 'Payment details retrieved');
});

/**
 * Get user's payment history
 * @route GET /api/payments/history
 * @access Private
 */
export const getUserPayments = asyncHandler(async (req, res) => {
  // Admin can query any user's payments, others can only see their own
  const userId = req.userRole === 'admin' && req.query.userId 
    ? req.query.userId 
    : req.userId;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const payments = await Payment.find({ userId })
    .populate('orderId', 'orderNumber status totalAmount')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await Payment.countDocuments({ userId });

  sendSuccess(res, 200, {
    payments,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit
    }
  }, 'Payments retrieved successfully');
});

/**
 * Refund a payment (Admin only)
 * @route POST /api/payments/refund/:id
 * @access Admin
 */
export const refundPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount, reason } = req.body;

  const payment = await Payment.findById(id);

  if (!payment) {
    return sendError(res, 404, 'Payment not found');
  }

  if (payment.status !== 'completed') {
    return sendError(res, 400, 'Only completed payments can be refunded');
  }

  if (payment.status === 'refunded') {
    return sendError(res, 400, 'Payment has already been refunded');
  }

  try {
    // Create refund in Razorpay
    const refundAmount = amount ? Math.round(amount * 100) : undefined;
    
    const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
      amount: refundAmount, // Partial or full refund
      notes: { 
        reason: reason || 'Refund requested by admin',
        adminId: req.userId.toString()
      }
    });

    console.log('✅ Refund created in Razorpay:', refund.id);

    // Update payment record
    payment.status = 'refunded';
    payment.refundId = refund.id;
    payment.refundedAt = new Date();
    payment.refundAmount = amount || payment.amount;
    payment.refundReason = reason;
    await payment.save();

    // Update order
    const order = await Order.findById(payment.orderId);
    if (order) {
      order.paymentStatus = 'refunded';
      order.status = 'cancelled';
      await order.save();
      console.log('✅ Order cancelled due to refund:', order._id);
    }

    sendSuccess(res, 200, {
      payment,
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      }
    }, 'Refund processed successfully');

  } catch (error) {
    console.error('❌ Refund processing error:', error.message);
    return sendError(res, 500, `Refund failed: ${error.message}`);
  }
});

/**
 * Get Razorpay key for frontend
 * @route GET /api/payments/config
 * @access Public
 */
export const getPaymentConfig = asyncHandler(async (req, res) => {
  if (!process.env.RAZORPAY_KEY_ID) {
    return sendError(res, 500, 'Payment gateway not configured');
  }

  sendSuccess(res, 200, {
    key: process.env.RAZORPAY_KEY_ID,
    currency: 'INR'
  }, 'Payment configuration retrieved');
});