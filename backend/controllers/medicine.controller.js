import Medicine from '../models/Medicine.js';
import Stock from '../models/Stock.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/errorHandler.js';
import Pharmacy from '../models/Pharmacy.js';

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
export const getMedicineAvailability =asyncHandler(async (req, res) => {
      const { id } = req.params;
    
      const stocks = await Stock.find({
        medicineId: id,
        quantity: { $gt: 0 }
      })
        .populate({
          path: 'pharmacyId',
          select: 'name address phone'
        });

      const availability = await Stock.find({
          medicine: req.params.id,
          quantity: { $gt: 0 },
          isAvailable: true
        })
        .populate({
          path: 'pharmacy',
          select: 'name address phone'
        })
        .populate({
          path: 'medicine',
          select: 'name'
      });
      
      sendSuccess(
        res,
        200,
        { availability },
        'Medicine availability fetched'
      );
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
