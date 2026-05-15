import express from 'express';
import {
  searchMedicines,
  getMedicineById,
  getMedicineAvailability,
  getCategories,
  createMedicine,
  updateMedicine,
  deleteMedicine
} from '../controllers/medicine.controller.js';
import { getPharmacyMedicines } from '../controllers/pharmacy.controller.js';
import { authMiddleware, requireRole, optionalAuth } from '../middleware/auth.middleware.js';
import { medicineValidation, mongoIdValidation, searchValidation, validate } from '../middleware/validation.middleware.js';

const router = express.Router();

// Public routes
router.get('/search', searchValidation, validate, searchMedicines);
router.get('/categories', getCategories);
router.get('/:id', mongoIdValidation('id'), validate, getMedicineById);
router.get('/:id/availability', mongoIdValidation('id'), validate, getMedicineAvailability);
router.get('/:id/pharmacies', mongoIdValidation('id'), validate, getPharmacyMedicines);

// Admin only routes
router.post('/', authMiddleware, requireRole('admin'), medicineValidation, validate, createMedicine);
router.put('/:id', authMiddleware, requireRole('admin'), mongoIdValidation('id'), validate, updateMedicine);
router.delete('/:id', authMiddleware, requireRole('admin'), mongoIdValidation('id'), validate, deleteMedicine);

export default router;
