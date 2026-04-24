import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true
  },
  pharmacy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pharmacy'
  },
  type: {
    type: String,
    enum: ['availability', 'price_drop', 'expiry_reminder'],
    default: 'availability'
  },
  targetPrice: {
    type: Number,
    min: 0
  },
  isTriggered: {
    type: Boolean,
    default: false
  },
  triggeredAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  notificationMethod: {
    type: String,
    enum: ['email', 'sms', 'push', 'all'],
    default: 'email'
  }
}, {
  timestamps: true
});

// Compound index for user-medicine-pharmacy combination
alertSchema.index({ user: 1, medicine: 1, pharmacy: 1 });

const Alert = mongoose.model('Alert', alertSchema);

export default Alert;
