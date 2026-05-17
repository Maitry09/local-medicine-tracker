import express from 'express';
import {
  getAllPharmacies,
  getPharmacyById,
  getPharmacyStock,
  registerPharmacy,
  updateMyPharmacy,
  getMyPharmacy,
  verifyPharmacy,
  rejectPharmacy,
  disablePharmacy,
  deletePharmacy
} from '../controllers/pharmacy.controller.js';
import { getPharmacyMedicines } from '../controllers/pharmacy.controller.js';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';
import { pharmacyValidation, mongoIdValidation, validate } from '../middleware/validation.middleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllPharmacies);
router.get('/:id', mongoIdValidation('id'), validate, getPharmacyById);
router.get('/:id/stock', mongoIdValidation('id'), validate, getPharmacyStock);
router.get('/:id/medicines', getPharmacyMedicines);

// Pharmacy owner routes
router.post('/register', authMiddleware, requireRole('pharmacy'), pharmacyValidation, validate, registerPharmacy);
router.get('/my/details', authMiddleware, requireRole('pharmacy'), getMyPharmacy);
router.put('/my/update', authMiddleware, requireRole('pharmacy'), updateMyPharmacy);

// Admin routes
router.patch('/:id/verify', authMiddleware, requireRole('admin'), mongoIdValidation('id'), validate, verifyPharmacy);
router.patch('/:id/disable', authMiddleware, requireRole('admin'), mongoIdValidation('id'), validate, disablePharmacy);
router.patch('/:id/reject', authMiddleware, requireRole('admin'), mongoIdValidation('id'), validate, rejectPharmacy);
router.delete('/:id', authMiddleware, requireRole('admin'), mongoIdValidation('id'), validate, deletePharmacy);

export default router;
