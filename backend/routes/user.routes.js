import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  disableUser,
  enableUser,
  deleteUser
} from '../controllers/user.controller.js';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';
import { mongoIdValidation, validate } from '../middleware/validation.middleware.js';

const router = express.Router();

// All routes require admin role
router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/', getAllUsers);
router.get('/:id', mongoIdValidation('id'), validate, getUserById);
router.put('/:id', mongoIdValidation('id'), validate, updateUser);
router.patch('/:id/disable', mongoIdValidation('id'), validate, disableUser);
router.patch('/:id/enable', mongoIdValidation('id'), validate, enableUser);
router.delete('/:id', mongoIdValidation('id'), validate, deleteUser);

export default router;
