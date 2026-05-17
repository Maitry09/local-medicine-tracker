import Review from '../models/Review.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/errorHandler.js';

// Create a review for a pharmacy (one per order)
export const createReview = asyncHandler(async (req, res) => {
  const { pharmacyId, orderId, rating, comment } = req.body;

  // prevent multiple reviews for same order
  if (orderId) {
    const existing = await Review.findOne({ order: orderId });
    if (existing) return sendError(res, 400, 'Review already exists for this order');
  }

  const review = await Review.create({ user: req.userId, pharmacy: pharmacyId, order: orderId, rating, comment });
  sendSuccess(res, 201, { review }, 'Review created');
});

export const getReviewsForPharmacy = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pharmacyId = req.params.id;

  const reviews = await Review.find({ pharmacy: pharmacyId })
    .populate('user', 'name')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await Review.countDocuments({ pharmacy: pharmacyId });

  sendSuccess(res, 200, { reviews, pagination: { current: parseInt(page), pages: Math.ceil(total / limit), total } }, 'Reviews fetched');
});

export default {};
