import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Medicine name is required'],
    trim: true,
    index: true
  },
  genericName: {
    type: String,
    trim: true,
    index: true
  },
  manufacturer: {
    type: String,
    required: [true, 'Manufacturer is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Antibiotics',
      'Painkillers',
      'Antacids',
      'Vitamins',
      'Diabetes',
      'Blood Pressure',
      'Heart',
      'Skin',
      'Eye Care',
      'Respiratory',
      'Digestive',
      'Mental Health',
      'Hormones',
      'Allergies',
      'Other'
    ]
  },
  description: {
    type: String,
    trim: true
  },
  dosageForm: {
    type: String,
    enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Powder', 'Other'],
    default: 'Tablet'
  },
  strength: {
    type: String,
    trim: true
  },
  prescriptionRequired: {
    type: Boolean,
    default: false
  },
  mrp: {
    type: Number,
    required: [true, 'MRP is required'],
    min: [0, 'MRP cannot be negative']
  },
  image: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Text index for search
medicineSchema.index({ name: 'text', genericName: 'text', manufacturer: 'text' });

const Medicine = mongoose.model('Medicine', medicineSchema);

export default Medicine;
