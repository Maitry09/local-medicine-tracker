import express from 'express';
import {
  getDashboardStats,
  getAllPharmaciesAdmin,
  updatePharmacyAdmin,
  getAllPayments,
  getActivityLogs,
  seedMedicines,
  createAdminUser
} from '../controllers/admin.controller.js';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';
import { mongoIdValidation, validate } from '../middleware/validation.middleware.js';

const router = express.Router();

// Public route for initial admin setup
router.post('/setup', createAdminUser);
router.post('/seed-medicines', authMiddleware, requireRole('admin'), seedMedicines);

// Protected admin routes
router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/pharmacies', getAllPharmaciesAdmin);
router.put('/pharmacies/:id', mongoIdValidation('id'), validate, updatePharmacyAdmin);
router.get('/payments', getAllPayments);
router.get('/activity', getActivityLogs);

export default router;
