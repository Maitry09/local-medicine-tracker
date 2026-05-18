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
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    // GeoJSON format required for MongoDB $nearSphere queries
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] }  // [longitude, latitude] — MongoDB uses [lng, lat] order!
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
  // temporary and permanent close controls
  permanentClose: {
    type: Boolean,
    default: false
  },
  tempCloseUntil: {
    type: Date,
    default: null
  },
  // approval status for admin workflow: pending, approved, rejected, disabled
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'disabled'],
    default: 'pending'
  },
  rejectionReason: {
    type: String
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
  },
  defaultDiscount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  defaultDeliveryFee: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

pharmacySchema.pre('save', function(next) {
  // Auto-populate GeoJSON location from coordinates
  if (this.address && this.address.coordinates) {
    this.address.location = {
      type: 'Point',
      // IMPORTANT: MongoDB GeoJSON is [longitude, latitude] — reversed from lat/lng!
      coordinates: [this.address.coordinates.lng, this.address.coordinates.lat]
    };
  }
  next();
});

// Index for geospatial queries
pharmacySchema.index({ 'address.location': '2dsphere' });

// Virtual for stock
pharmacySchema.virtual('stock', {
  ref: 'Stock',
  localField: '_id',
  foreignField: 'pharmacy'
});

const Pharmacy = mongoose.model('Pharmacy', pharmacySchema);

export default Pharmacy;
