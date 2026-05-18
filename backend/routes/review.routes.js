import express from 'express';
import { createReview, getReviewsForPharmacy, updateReview, deleteReview, getMyReviews } from '../controllers/review.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', authMiddleware, createReview);
router.get('/my-reviews', authMiddleware, getMyReviews);
router.get('/pharmacy/:id', getReviewsForPharmacy);
router.put('/:id', authMiddleware, updateReview);
router.delete('/:id', authMiddleware, deleteReview);

export default router;