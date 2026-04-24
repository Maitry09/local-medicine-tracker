import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  razorpayOrderId: {
    type: String,
    required: true
  },
  razorpayPaymentId: {
    type: String
  },
  razorpaySignature: {
    type: String
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['created', 'authorized', 'captured', 'refunded', 'failed'],
    default: 'created'
  },
  method: {
    type: String
  },
  bank: {
    type: String
  },
  wallet: {
    type: String
  },
  vpa: {
    type: String
  },
  errorCode: {
    type: String
  },
  errorDescription: {
    type: String
  },
  refundId: {
    type: String
  },
  refundAmount: {
    type: Number
  },
  refundedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for quick lookups
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
