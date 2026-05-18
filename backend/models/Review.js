import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pharmacy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pharmacy',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 500
  },
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  },
  editCount: {
    type: Number,
    default: 0
  },
  lastEditedAt: {
    type: Date
  }
}, { timestamps: true });

// Index for faster queries, but not unique anymore (users can leave multiple reviews)
reviewSchema.index({ pharmacy: 1, user: 1 });
reviewSchema.index({ order: 1 });

export default mongoose.model('Review', reviewSchema);