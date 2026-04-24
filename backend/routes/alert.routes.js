import express from 'express';
import {
  getMyAlerts,
  createAlert,
  updateAlert,
  deleteAlert,
  acknowledgeAlert,
  getTriggeredAlertsCount
} from '../controllers/alert.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { alertValidation, mongoIdValidation, validate } from '../middleware/validation.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', getMyAlerts);
router.get('/triggered/count', getTriggeredAlertsCount);
router.post('/', alertValidation, validate, createAlert);
router.put('/:id', mongoIdValidation('id'), validate, updateAlert);
router.patch('/:id/acknowledge', mongoIdValidation('id'), validate, acknowledgeAlert);
router.delete('/:id', mongoIdValidation('id'), validate, deleteAlert);

export default router;
