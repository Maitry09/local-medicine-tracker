import Pharmacy from '../models/Pharmacy.js';
import User from '../models/User.js';
import Stock from '../models/Stock.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/errorHandler.js';

// Get all pharmacies
export const getAllPharmacies = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    city, 
    isVerified, 
    is24Hours,
    lat,
    lng,
    radius = 10,
    search
  } = req.query;

  const query = { isActive: true };

  if (city) {
    query['address.city'] = { $regex: city, $options: 'i' };
  }

  if (isVerified !== undefined) {
    query.isVerified = isVerified === 'true';
  }

  if (is24Hours !== undefined) {
    query['operatingHours.is24Hours'] = is24Hours === 'true';
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { 'address.city': { $regex: search, $options: 'i' } }
    ];
  }

  let pharmacies = await Pharmacy.find(query)
    .populate('owner', 'name email phone')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ rating: -1 });

  // If coordinates provided, calculate distances
  if (lat && lng) {
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    
    pharmacies = pharmacies.map(pharmacy => {
      const pharmacyLat = pharmacy.address.coordinates.lat;
      const pharmacyLng = pharmacy.address.coordinates.lng;
      
      // Haversine formula
      const R = 6371;
      const dLat = (pharmacyLat - userLat) * Math.PI / 180;
      const dLng = (pharmacyLng - userLng) * Math.PI / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(userLat * Math.PI / 180) * Math.cos(pharmacyLat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      return {
        ...pharmacy.toObject(),
        distance: Math.round(distance * 10) / 10
      };
    }).filter(p => p.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }

  const total = await Pharmacy.countDocuments(query);

  sendSuccess(res, 200, {
    pharmacies,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    }
  }, 'Pharmacies fetched successfully');
});

// Get pharmacy by ID
export const getPharmacyById = asyncHandler(async (req, res) => {
  const pharmacy = await Pharmacy.findById(req.params.id)
    .populate('owner', 'name email phone');

  if (!pharmacy) {
    return sendError(res, 404, 'Pharmacy not found');
  }

  sendSuccess(res, 200, { pharmacy }, 'Pharmacy fetched successfully');
});

// Get pharmacy stock
export const getPharmacyStock = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, category, inStock } = req.query;

  const pharmacy = await Pharmacy.findById(req.params.id);
  
  if (!pharmacy) {
    return sendError(res, 404, 'Pharmacy not found');
  }

  const stockQuery = { pharmacy: req.params.id };

  if (inStock !== undefined) {
    if (inStock === 'true') {
      stockQuery.quantity = { $gt: 0 };
      stockQuery.isAvailable = true;
    }
  }

  let stock = await Stock.find(stockQuery)
    .populate('medicine')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ lastUpdated: -1 });

  // Filter by medicine search/category after population
  if (search || category) {
    stock = stock.filter(item => {
      let match = true;
      if (search) {
        const searchLower = search.toLowerCase();
        match = match && (
          item.medicine.name.toLowerCase().includes(searchLower) ||
          (item.medicine.genericName && item.medicine.genericName.toLowerCase().includes(searchLower))
        );
      }
      if (category) {
        match = match && item.medicine.category === category;
      }
      return match;
    });
  }

  const total = await Stock.countDocuments(stockQuery);

  sendSuccess(res, 200, {
    pharmacy,
    stock,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    }
  }, 'Pharmacy stock fetched successfully');
});

// Register pharmacy (for pharmacy role users)
export const registerPharmacy = asyncHandler(async (req, res) => {
  const existingPharmacy = await Pharmacy.findOne({ owner: req.userId });
  
  if (existingPharmacy) {
    return sendError(res, 400, 'You already have a registered pharmacy');
  }

  const pharmacy = await Pharmacy.create({
    ...req.body,
    owner: req.userId,
    email: req.user.email
  });

  // Update user with pharmacy reference
  await User.findByIdAndUpdate(req.userId, { pharmacyId: pharmacy._id });

  sendSuccess(res, 201, { pharmacy }, 'Pharmacy registered successfully');
});

// Update my pharmacy (pharmacy owner)
export const updateMyPharmacy = asyncHandler(async (req, res) => {
  const pharmacy = await Pharmacy.findOne({ owner: req.userId });

  if (!pharmacy) {
    return sendError(res, 404, 'Pharmacy not found');
  }

  const { name, phone, address, operatingHours } = req.body;

  const updated = await Pharmacy.findByIdAndUpdate(
    pharmacy._id,
    { name, phone, address, operatingHours },
    { new: true, runValidators: true }
  );

  sendSuccess(res, 200, { pharmacy: updated }, 'Pharmacy updated successfully');
});

// Get my pharmacy (pharmacy owner)
export const getMyPharmacy = asyncHandler(async (req, res) => {
  const pharmacy = await Pharmacy.findOne({ owner: req.userId });

  if (!pharmacy) {
    return sendError(res, 404, 'Pharmacy not found');
  }

  sendSuccess(res, 200, { pharmacy }, 'Pharmacy fetched successfully');
});

// Verify pharmacy (admin only)
export const verifyPharmacy = asyncHandler(async (req, res) => {
  const pharmacy = await Pharmacy.findByIdAndUpdate(
    req.params.id,
    { isVerified: true },
    { new: true }
  );

  if (!pharmacy) {
    return sendError(res, 404, 'Pharmacy not found');
  }

  sendSuccess(res, 200, { pharmacy }, 'Pharmacy verified successfully');
});

// Disable pharmacy (admin only)
export const disablePharmacy = asyncHandler(async (req, res) => {
  const pharmacy = await Pharmacy.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!pharmacy) {
    return sendError(res, 404, 'Pharmacy not found');
  }

  sendSuccess(res, 200, { pharmacy }, 'Pharmacy disabled successfully');
});

// Delete pharmacy (admin only)
export const deletePharmacy = asyncHandler(async (req, res) => {
  const pharmacy = await Pharmacy.findById(req.params.id);

  if (!pharmacy) {
    return sendError(res, 404, 'Pharmacy not found');
  }

  // Remove pharmacy reference from user
  await User.findByIdAndUpdate(pharmacy.owner, { pharmacyId: null });
  
  // Delete all stock entries
  await Stock.deleteMany({ pharmacy: pharmacy._id });
  
  // Delete pharmacy
  await Pharmacy.findByIdAndDelete(req.params.id);

  sendSuccess(res, 200, null, 'Pharmacy deleted successfully');
});
