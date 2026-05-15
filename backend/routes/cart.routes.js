import express from 'express';
import {
  getMyCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} from '../controllers/cart.controller.js';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole('patient'));

router.get('/', getMyCart);
router.post('/add', addToCart);
router.put('/item/:itemId', updateCartItem);
router.delete('/item/:itemId', removeFromCart);
router.delete('/clear', clearCart);

export default router;