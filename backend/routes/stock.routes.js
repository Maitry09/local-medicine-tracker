import express from 'express';
import {
  getMyStock,
  addStock,
  updateStock,
  deleteStock,
  bulkUpdateStock
} from '../controllers/stock.controller.js';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';
import { stockValidation, stockUpdateValidation, mongoIdValidation, validate } from '../middleware/validation.middleware.js';

const router = express.Router();

// All routes require pharmacy or admin role
router.use(authMiddleware);
router.use(requireRole('pharmacy', 'admin'));

router.get('/', getMyStock);
router.post('/', stockValidation, validate, addStock);
router.put('/:id', mongoIdValidation('id'), stockUpdateValidation, validate, updateStock);
router.delete('/:id', mongoIdValidation('id'), validate, deleteStock);
router.post('/bulk', bulkUpdateStock);

export default router;
