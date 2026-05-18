import express from 'express';

import {
  getMyOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updateCODPaymentStatus,
  getPharmacyOrders,
  cancelOrder,
  getAllOrders
} from '../controllers/order.controller.js';

import {
  authMiddleware,
  requireRole
} from '../middleware/auth.middleware.js';

import {
  orderValidation,
  mongoIdValidation,
  validate
} from '../middleware/validation.middleware.js';

const router = express.Router();

router.use(authMiddleware);

// ================= PATIENT =================

// my orders
router.get('/my-orders', getMyOrders);

// create order
router.post(
  '/',
  orderValidation,
  validate,
  createOrder
);

// cancel order
router.patch(
  '/:id/cancel',
  mongoIdValidation('id'),
  validate,
  cancelOrder
);

// ================= PHARMACY =================

router.get(
  '/pharmacy/orders',
  requireRole('pharmacy', 'admin'),
  getPharmacyOrders
);

router.patch(
  '/:id/status',
  requireRole('pharmacy', 'admin'),
  mongoIdValidation('id'),
  validate,
  updateOrderStatus
);

// COD payment status update (pharmacy marks cash as collected)
router.patch(
  '/:id/payment-status',
  requireRole('pharmacy', 'admin'),
  mongoIdValidation('id'),
  validate,
  updateCODPaymentStatus
);

// ================= ADMIN =================

router.get(
  '/admin/all',
  requireRole('admin'),
  getAllOrders
);

// IMPORTANT KEEP LAST
router.get(
  '/:id',
  mongoIdValidation('id'),
  validate,
  getOrderById
);

export default router;