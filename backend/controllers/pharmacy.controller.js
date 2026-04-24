import Pharmacy from '../models/Pharmacy.js';
import User from '../models/User.js';
import Stock from '../models/Stock.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/errorHandler.js';

// Get all pharmacies
// GET /api/pharmacies
export const getAllPharmacies = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    city,
    isVerified,
    is24Hours,
    lat,
    lng,
    radius = 10,  // km
    search
  } = req.query;

  const query = { isActive: true };

  if (city) query['address.city'] = { $regex: city, $options: 'i' };
  if (isVerified !== undefined) query.isVerified = isVerified === 'true';
  if (is24Hours !== undefined) query['operatingHours.is24Hours'] = is24Hours === 'true';
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { 'address.city': { $regex: search, $options: 'i' } }
    ];
  }

  let pharmacies;
  let total;

  if (lat && lng) {
    // FIXED: Use MongoDB $nearSphere — uses the 2dsphere index, returns pre-sorted by distance
    // IMPORTANT: MongoDB GeoJSON uses [longitude, latitude] order
    const userLng = parseFloat(lng);
    const userLat = parseFloat(lat);
    const maxDistanceMeters = parseFloat(radius) * 1000; // convert km to meters

    // $nearSphere automatically sorts by distance ascending
    const geoQuery = {
      ...query,
      'address.location': {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [userLng, userLat]  // [lng, lat] — MongoDB order!
          },
          $maxDistance: maxDistanceMeters
        }
      }
    };

    // $nearSphere does not support .count() directly, so we run both
    [pharmacies, total] = await Promise.all([
      Pharmacy.find(geoQuery)
        .populate('owner', 'name email phone')
        .skip((page - 1) * parseInt(limit))
        .limit(parseInt(limit)),
      Pharmacy.countDocuments(geoQuery)
    ]);

    // Calculate and attach distance for display (MongoDB doesn't return it with find())
    pharmacies = pharmacies.map(pharmacy => {
      const p = pharmacy.toObject();
      const pharmacyLng = pharmacy.address.coordinates.lng;
      const pharmacyLat = pharmacy.address.coordinates.lat;

      // Haversine for display only — query already filtered by distance
      const R = 6371;
      const dLat = (pharmacyLat - userLat) * Math.PI / 180;
      const dLng = (pharmacyLng - userLng) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(userLat * Math.PI / 180) * Math.cos(pharmacyLat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
      p.distance = Math.round(2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * R * 10) / 10;
      return p;
    });

  } else {
    // No location filter — standard query sorted by rating
    [pharmacies, total] = await Promise.all([
      Pharmacy.find(query)
        .populate('owner', 'name email phone')
        .skip((page - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .sort({ rating: -1 }),
      Pharmacy.countDocuments(query)
    ]);
  }

  sendSuccess(res, 200, {
    pharmacies,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
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
// GET /api/pharmacies/:id/stock
export const getPharmacyStock = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, category, inStock } = req.query;

  const pharmacy = await Pharmacy.findById(req.params.id);
  if (!pharmacy) return sendError(res, 404, 'Pharmacy not found');

  // FIXED: Filter before paginating using aggregation
  const pipeline = [
    { $match: { pharmacy: pharmacy._id } },
    {
      $lookup: {
        from: 'medicines',
        localField: 'medicine',
        foreignField: '_id',
        as: 'medicine'
      }
    },
    { $unwind: '$medicine' },

    // Apply filters before pagination
    ...(inStock === 'true' ? [{ $match: { quantity: { $gt: 0 }, isAvailable: true } }] : []),
    ...(search ? [{
      $match: {
        $or: [
          { 'medicine.name': { $regex: search, $options: 'i' } },
          { 'medicine.genericName': { $regex: search, $options: 'i' } }
        ]
      }
    }] : []),
    ...(category ? [{ $match: { 'medicine.category': category } }] : []),

    { $sort: { lastUpdated: -1 } },
    {
      $facet: {
        stock: [
          { $skip: (parseInt(page) - 1) * parseInt(limit) },
          { $limit: parseInt(limit) }
        ],
        totalCount: [{ $count: 'count' }]
      }
    }
  ];

  const [result] = await Stock.aggregate(pipeline);
  const total = result.totalCount[0]?.count || 0;

  sendSuccess(res, 200, {
    pharmacy,
    stock: result.stock,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
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
