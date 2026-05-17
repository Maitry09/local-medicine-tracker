import Pharmacy from '../models/Pharmacy.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/errorHandler.js';
import Stock from '../models/Stock.js';

// Get all pharmacies
// GET /api/pharmacies
export const getAllPharmacies = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    city,
    is24Hours,
    lat,
    lng,
    radius = 10,  // km
    search
  } = req.query;

  const query = { isActive: true, status: 'approved' };

  if (city) query['address.city'] = { $regex: city, $options: 'i' };
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
    // FIXED: Use aggregation with $geoNear for proper geospatial queries
    // $geoNear must be the FIRST stage in aggregation pipeline
    const userLng = parseFloat(lng);
    const userLat = parseFloat(lat);
    const maxDistanceMeters = parseFloat(radius) * 1000; // convert km to meters

    // Build match stage for additional filters
    const matchStage = { isActive: true, status: 'approved' };
    if (city) matchStage['address.city'] = { $regex: city, $options: 'i' };
    if (is24Hours !== undefined) matchStage['operatingHours.is24Hours'] = is24Hours === 'true';
    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } }
      ];
    }

    const pipeline = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [userLng, userLat]  // [lng, lat] — MongoDB GeoJSON order
          },
          distanceField: 'distance',  // Distance in meters
          maxDistance: maxDistanceMeters,
          spherical: true,
          key: 'address.location'
        }
      },
      // Apply additional filters after $geoNear
      { $match: matchStage },
      // Lookup owner information
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'owner',
          pipeline: [
            { $project: { name: 1, email: 1, phone: 1 } }
          ]
        }
      },
      { $unwind: '$owner' },
      // Facet for pagination and count
      {
        $facet: {
          pharmacies: [
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) }
          ],
          totalCount: [{ $count: 'count' }]
        }
      }
    ];

    const [result] = await Pharmacy.aggregate(pipeline);
    
    pharmacies = result.pharmacies.map(p => ({
      ...p,
      distance: Math.round(p.distance / 100) / 10  // Convert meters to km with 1 decimal
    }));
    
    total = result.totalCount[0]?.count || 0;

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

  // Filter before paginating using aggregation
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
    { status: 'approved', isVerified: true, rejectionReason: undefined },
    { new: true }
  );

  if (!pharmacy) {
    return sendError(res, 404, 'Pharmacy not found');
  }

  // Notify owner
  const owner = await User.findById(pharmacy.owner);
  if (owner) {
    await Notification.create({
      user: owner._id,
      title: 'Pharmacy approved',
      message: `Your pharmacy "${pharmacy.name}" has been approved and is now visible to customers.`,
      type: 'general',
      link: `/pharmacy/profile`,
      meta: { pharmacyId: pharmacy._id }
    });
  }

  sendSuccess(res, 200, { pharmacy }, 'Pharmacy approved successfully');
});

export const rejectPharmacy = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const pharmacy = await Pharmacy.findById(req.params.id).populate('owner', 'name email');

  if (!pharmacy) {
    return sendError(res, 404, 'Pharmacy not found');
  }

  pharmacy.status = 'rejected';
  pharmacy.isVerified = false;
  pharmacy.isActive = false;
  pharmacy.rejectionReason = reason || 'Rejected by admin';

  await pharmacy.save();

  // Notify owner
  if (pharmacy.owner) {
    await Notification.create({
      user: pharmacy.owner._id,
      title: 'Pharmacy application rejected',
      message: `Your pharmacy "${pharmacy.name}" was rejected. Reason: ${pharmacy.rejectionReason}`,
      type: 'general',
      link: `/pharmacy/profile`,
      meta: { pharmacyId: pharmacy._id }
    });
  }

  sendSuccess(res, 200, { pharmacy }, 'Pharmacy rejected successfully');
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

export const getPharmacyMedicines = asyncHandler(async (req, res) => {
  const pharmacyId = req.params.id;

  const medicines = await Stock.find({
    pharmacy: pharmacyId,
    quantity: { $gt: 0 }
  })
    .populate('medicine')
    .populate('pharmacy');

  sendSuccess(res, 200, {
    medicines
  }, 'Medicines fetched');
});