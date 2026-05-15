import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['order', 'payment', 'stock', 'alert', 'prescription', 'general', 'promotion'],
    default: 'general'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  link: {
    type: String
  },
  meta: {
    type: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);