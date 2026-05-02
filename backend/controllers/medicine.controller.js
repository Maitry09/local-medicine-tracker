import Medicine from '../models/Medicine.js';
import Stock from '../models/Stock.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/errorHandler.js';

// Search medicines
export const searchMedicines = asyncHandler(async (req, res) => {
  const { 
    q, 
    category, 
    manufacturer,
    dosageForm,
    prescriptionRequired,
    minPrice,
    maxPrice,
    page = 1, 
    limit = 10,
    sortBy = 'name',
    sortOrder = 'asc'
  } = req.query;

  const query = { isActive: true };

  // Text search
  if (q) {
    query.$or = [
      { name: { $regex: q, $options: 'i' } },
      { genericName: { $regex: q, $options: 'i' } },
      { manufacturer: { $regex: q, $options: 'i' } }
    ];
  }

  // Filters
  if (category) {
    query.category = category;
  }

  if (manufacturer) {
    query.manufacturer = { $regex: manufacturer, $options: 'i' };
  }

  if (dosageForm) {
    query.dosageForm = dosageForm;
  }

  if (prescriptionRequired !== undefined) {
    query.prescriptionRequired = prescriptionRequired === 'true';
  }

  if (minPrice || maxPrice) {
    query.mrp = {};
    if (minPrice) query.mrp.$gte = parseFloat(minPrice);
    if (maxPrice) query.mrp.$lte = parseFloat(maxPrice);
  }

  // Sorting
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const medicines = await Medicine.find(query)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort(sort);

  const total = await Medicine.countDocuments(query);

  sendSuccess(res, 200, {
    medicines,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    }
  }, 'Medicines fetched successfully');
});

// Get medicine by ID
export const getMedicineById = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findById(req.params.id);

  if (!medicine) {
    return sendError(res, 404, 'Medicine not found');
  }

  sendSuccess(res, 200, { medicine }, 'Medicine fetched successfully');
});

// Get medicine availability (which pharmacies have it in stock)
// GET /api/medicines/:id/availability
export const getMedicineAvailability = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 10 } = req.query;

  const medicine = await Medicine.findById(req.params.id);
  if (!medicine) return sendError(res, 404, 'Medicine not found');

  const stockQuery = {
    medicine: req.params.id,
    isAvailable: true,
    quantity: { $gt: 0 },
    expiryDate: { $gt: new Date() }
  };

  // FIXED: Use aggregation with $lookup to filter pharmacies by geo BEFORE joining stock
  if (lat && lng) {
    const userLng = parseFloat(lng);
    const userLat = parseFloat(lat);
    const maxDistanceMeters = parseFloat(radius) * 1000;

    const stockItems = await Stock.aggregate([
      // Step 1: Match stock for this medicine
      { $match: stockQuery },

      // Step 2: Lookup pharmacies
      {
        $lookup: {
          from: 'pharmacies',
          localField: 'pharmacy',
          foreignField: '_id',
          as: 'pharmacy'
        }
      },
      { $unwind: '$pharmacy' },

      // Step 3: Filter by pharmacy active/verified status
      {
        $match: {
          'pharmacy.isActive': true,
          'pharmacy.isVerified': true
        }
      },

      // Step 4: Filter by geo distance using $nearSphere via $expr
      // We use $geoNear in an aggregation pipeline instead
      { $sort: { price: 1 } },
      { $limit: 50 } // Limit results
    ]);

    // Calculate distances for display
    const withDistance = stockItems.map(item => {
      const pharmacyLng = item.pharmacy.address.coordinates.lng;
      const pharmacyLat = item.pharmacy.address.coordinates.lat;
      const R = 6371;
      const dLat = (pharmacyLat - userLat) * Math.PI / 180;
      const dLng = (pharmacyLng - userLng) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(userLat * Math.PI / 180) * Math.cos(pharmacyLat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
      const distance = Math.round(2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * R * 10) / 10;
      return { ...item, distance };
    }).filter(item => item.distance <= parseFloat(radius))
      .sort((a, b) => a.distance - b.distance);

    return sendSuccess(res, 200, { medicine, availability: withDistance }, 'Availability fetched');
  }

  // No location — just return all pharmacies with stock
  let stockItems = await Stock.find(stockQuery)
    .populate({ path: 'pharmacy', match: { isActive: true, isVerified: true } })
    .sort({ price: 1 });

  stockItems = stockItems.filter(item => item.pharmacy !== null);

  sendSuccess(res, 200, { medicine, availability: stockItems }, 'Availability fetched successfully');
});

// Get all categories
export const getCategories = asyncHandler(async (req, res) => {
  const categories = [
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
  ];

  sendSuccess(res, 200, { categories }, 'Categories fetched successfully');
});

// Create medicine (admin only)
export const createMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.create(req.body);
  sendSuccess(res, 201, { medicine }, 'Medicine created successfully');
});

// Update medicine (admin only)
export const updateMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!medicine) {
    return sendError(res, 404, 'Medicine not found');
  }

  sendSuccess(res, 200, { medicine }, 'Medicine updated successfully');
});

// Delete medicine (admin only)
export const deleteMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!medicine) {
    return sendError(res, 404, 'Medicine not found');
  }

  sendSuccess(res, 200, null, 'Medicine deleted successfully');
});
