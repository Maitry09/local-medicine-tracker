import mongoose from 'mongoose';

const pharmacySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Pharmacy name is required'],
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    unique: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  address: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    pincode: {
      type: String,
      required: true
    },
    coordinates: {
      lat: {
        type: Number,
        required: true
      },
      lng: {
        type: Number,
        required: true
      }
    }
  },
  operatingHours: {
    open: {
      type: String,
      default: '09:00'
    },
    close: {
      type: String,
      default: '21:00'
    },
    is24Hours: {
      type: Boolean,
      default: false
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for geospatial queries
pharmacySchema.index({ 'address.coordinates': '2dsphere' });

// Virtual for stock
pharmacySchema.virtual('stock', {
  ref: 'Stock',
  localField: '_id',
  foreignField: 'pharmacy'
});

const Pharmacy = mongoose.model('Pharmacy', pharmacySchema);

export default Pharmacy;
