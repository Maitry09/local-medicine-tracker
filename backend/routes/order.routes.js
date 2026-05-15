import express from 'express';
import {
  getMyOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  getPharmacyOrders,
  cancelOrder,
  ordercreate,
  getAllOrders,
  getOrders
} from '../controllers/order.controller.js';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';
import {
  orderValidation,
  mongoIdValidation,
  validate
} from '../middleware/validation.middleware.js';

const router = express.Router();

router.use(authMiddleware);

// ================= PATIENT =================
router.get('/my', getMyOrders);
router.post('/', orderValidation, validate, createOrder);
router.patch('/:id/cancel', mongoIdValidation('id'), validate, cancelOrder);
router.post('/', authMiddleware, ordercreate);

const Order = require('../models/Order');
router.post('/', authMiddleware, createOrder);
// ================= PHARMACY =================
router.get('/pharmacy/orders', requireRole('pharmacy', 'admin'), getPharmacyOrders);
router.patch(
  '/:id/status',
  requireRole('pharmacy', 'admin'),
  mongoIdValidation('id'),
  validate,
  updateOrderStatus
);
router.get('/my-orders', authMiddleware,getOrders);

// ================= ADMIN =================
router.get('/admin/all', requireRole('admin'), getAllOrders);

// IMPORTANT: KEEP THIS LAST
router.get('/:id', mongoIdValidation('id'), validate, getOrderById);

export default router;