import express from 'express';
import { addSavedMedicine, getMySaved, deleteSaved } from '../controllers/savedMedicine.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', addSavedMedicine);
router.get('/', getMySaved);
router.delete('/:id', deleteSaved);

export default router;
