import mongoose from 'mongoose';

const stockSchema = new mongoose.Schema({
  pharmacy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pharmacy',
    required: true
  },
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  batchNumber: {
    type: String,
    trim: true
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required']
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for pharmacy-medicine combination
stockSchema.index({ pharmacy: 1, medicine: 1 }, { unique: true });

// Update lastUpdated on save
stockSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Virtual for final price after discount
stockSchema.virtual('finalPrice').get(function() {
  return this.price - (this.price * this.discount / 100);
});

stockSchema.set('toJSON', { virtuals: true });
stockSchema.set('toObject', { virtuals: true });

const Stock = mongoose.model('Stock', stockSchema);

export default Stock;
