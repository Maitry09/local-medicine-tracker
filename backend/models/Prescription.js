import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pharmacy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pharmacy'
  },
  responses: [
    {
      pharmacy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pharmacy',
        required: true
      },
      pharmacyName: {
        type: String,
        required: true,
        trim: true
      },
      status: {
        type: String,
        enum: ['submitted', 'approved', 'rejected'],
        default: 'approved'
      },
      message: {
        type: String,
        trim: true
      },
      pricingDetails: {
        type: String,
        trim: true
      },
      suggestedMedicines: [
        {
          medicine: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Medicine'
          },
          name: {
            type: String,
            trim: true
          },
          available: {
            type: Boolean,
            default: false
          },
          price: {
            type: Number,
            min: 0,
            default: 0
          },
          note: {
            type: String,
            trim: true
          }
        }
      ],
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  imageUrl: {
    type: String,
    required: true
  },
  cloudinaryId: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: { type: String },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date }
}, { timestamps: true });

export default mongoose.model('Prescription', prescriptionSchema);
