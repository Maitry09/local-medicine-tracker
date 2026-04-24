import express from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updateProfile,
  changePassword
} from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { registerValidation, loginValidation, validate } from '../middleware/validation.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/refresh-token', refreshToken);

// Protected routes
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, getMe);
router.put('/profile', authMiddleware, updateProfile);
router.put('/change-password', authMiddleware, changePassword);

export default router;
