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

// Index for faster queries: allow multiple reviews per user/pharmacy
reviewSchema.index({ pharmacy: 1, user: 1 });
// Create a sparse index on order so documents without order (null) are not indexed
reviewSchema.index({ order: 1 }, { sparse: true });

const Review = mongoose.model('Review', reviewSchema);

// Clean up any conflicting unique index on `order` created previously
// Run after mongoose opens connection
import mongooseConnection from 'mongoose';

mongooseConnection.connection.on('open', async () => {
  try {
    const existing = await Review.collection.indexes();
    const orderIdx = existing.find(i => i.key && i.key.order === 1);
    if (orderIdx && orderIdx.unique) {
      try {
        await Review.collection.dropIndex('order_1');
        console.log('Dropped unique index order_1 on reviews collection');
        await Review.collection.createIndex({ order: 1 }, { sparse: true });
        console.log('Created sparse index on reviews.order');
      } catch (err) {
        console.error('Failed to drop/create review order index:', err.message);
      }
    }
  } catch (err) {
    console.error('Error checking review indexes:', err.message);
  }
});

export default Review;