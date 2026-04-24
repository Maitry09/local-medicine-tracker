import express from 'express';
import {
  getMyOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  getPharmacyOrders,
  cancelOrder,
  getAllOrders
} from '../controllers/order.controller.js';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';
import { orderValidation, mongoIdValidation, validate } from '../middleware/validation.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Patient routes
router.get('/my', getMyOrders);
router.post('/', orderValidation, validate, createOrder);
router.patch('/:id/cancel', mongoIdValidation('id'), validate, cancelOrder);

// Shared routes
router.get('/:id', mongoIdValidation('id'), validate, getOrderById);

// Pharmacy routes
router.get('/pharmacy/orders', requireRole('pharmacy', 'admin'), getPharmacyOrders);
router.patch('/:id/status', requireRole('pharmacy', 'admin'), mongoIdValidation('id'), validate, updateOrderStatus);

// Admin routes
router.get('/admin/all', requireRole('admin'), getAllOrders);

export default router;
