import Review from '../models/Review.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/errorHandler.js';

// Create a review for a pharmacy (unlimited reviews allowed per user)
export const createReview = asyncHandler(async (req, res) => {
  const { pharmacyId, orderId, rating, comment } = req.body;

  // Create review - users can now leave multiple reviews
  const review = await Review.create({ 
    user: req.userId, 
    pharmacy: pharmacyId, 
    order: orderId, 
    rating, 
    comment 
  });
  
  await review.populate('user', 'name');
  
  sendSuccess(res, 201, { review }, 'Review created successfully');
});

// Get reviews for a pharmacy
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

// Update review (only once - edit count limit)
export const updateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  const review = await Review.findById(id);

  if (!review) {
    return sendError(res, 404, 'Review not found');
  }

  // Check if user owns this review
  if (review.user.toString() !== req.userId) {
    return sendError(res, 403, 'You can only edit your own reviews');
  }

  // Check if already edited once
  if (review.editCount >= 1) {
    return sendError(res, 400, 'Review can only be edited once');
  }

  // Update review
  review.rating = rating;
  review.comment = comment;
  review.editCount += 1;
  review.lastEditedAt = new Date();

  await review.save();
  await review.populate('user', 'name');

  sendSuccess(res, 200, { review }, 'Review updated successfully');
});

// Delete review
export const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const review = await Review.findById(id);

  if (!review) {
    return sendError(res, 404, 'Review not found');
  }

  // Check if user owns this review
  if (review.user.toString() !== req.userId) {
    return sendError(res, 403, 'You can only delete your own reviews');
  }

  await Review.findByIdAndDelete(id);

  sendSuccess(res, 200, {}, 'Review deleted successfully');
});

export default {};

export const getMyReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const reviews = await Review.find({ user: req.userId })
    .populate('pharmacy', 'name address')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await Review.countDocuments({ user: req.userId });

  sendSuccess(res, 200, { reviews, pagination: { current: parseInt(page), pages: Math.ceil(total / limit), total } }, 'Your reviews fetched');
});

// Get all reviews (public)
export const getAllReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const reviews = await Review.find({})
    .populate('user', 'name')
    .populate('pharmacy', 'name')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await Review.countDocuments({});

  sendSuccess(res, 200, { reviews, pagination: { current: parseInt(page), pages: Math.ceil(total / limit), total } }, 'All reviews fetched');
});