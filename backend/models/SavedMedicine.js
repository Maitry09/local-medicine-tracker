import mongoose from 'mongoose';

const savedMedicineSchema = new mongoose.Schema({
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
  note: {
    type: String,
    trim: true
  }
}, { timestamps: true });

savedMedicineSchema.index({ user: 1, medicine: 1 }, { unique: true });

export default mongoose.model('SavedMedicine', savedMedicineSchema);