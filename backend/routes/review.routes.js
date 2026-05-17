import express from 'express';
import { createReview, getReviewsForPharmacy } from '../controllers/review.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', authMiddleware, createReview);
router.get('/pharmacy/:id', getReviewsForPharmacy);

export default router;
