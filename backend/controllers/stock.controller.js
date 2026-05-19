import Stock from '../models/Stock.js';
import Medicine from '../models/Medicine.js';
import Pharmacy from '../models/Pharmacy.js';
import Alert from '../models/Alert.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

const resolvePharmacyForUser = async (req) => {
  let pharmacy = await Pharmacy.findOne({ owner: req.userId });
  if (!pharmacy && req.user.pharmacyId) {
    pharmacy = await Pharmacy.findById(req.user.pharmacyId);
  }
  return pharmacy;
};

// Get my pharmacy stock (pharmacy owner or admin)
// GET /api/stock/
export const getMyStock = asyncHandler(async (req, res) => {
  let pharmacy;
  let stockQuery = {};
  const { search, pharmacyId } = req.query;

  if (req.user.role === 'admin') {
    if (pharmacyId) {
      pharmacy = await Pharmacy.findById(pharmacyId);
      if (!pharmacy) {
        return sendError(res, 404, 'Pharmacy not found');
      }
      stockQuery.pharmacy = pharmacy._id;
    }
  } else {
    pharmacy = await resolvePharmacyForUser(req);
    if (!pharmacy) {
      return sendError(res, 404, 'Pharmacy not found');
    }
    stockQuery.pharmacy = pharmacy._id;
  }

  let stock = await Stock.find(stockQuery)
    .populate('medicine')
    .sort({ createdAt: -1 });

  if (search) {
    const searchLower = search.toLowerCase();
    stock = stock.filter((item) => {
      return item.medicine?.name?.toLowerCase().includes(searchLower) ||
        item.medicine?.genericName?.toLowerCase().includes(searchLower);
    });
  }

  sendSuccess(
    res,
    200,
    {
      stock
    },
    'Stock fetched successfully'
  );
});

const createOrFindMedicine = async (medicineId, newMedicine) => {
  if (medicineId && medicineId !== 'other') {
    const existing = await Medicine.findById(medicineId);
    if (existing) return existing;
  }

  if (!newMedicine || !newMedicine.name) {
    return null;
  }

  const normalizedName = newMedicine.name.trim();
  const normalizedManufacturer = newMedicine.manufacturer?.trim();
  const searchQuery = {
    name: { $regex: `^${normalizedName}$`, $options: 'i' }
  };
  if (normalizedManufacturer) {
    searchQuery.manufacturer = { $regex: `^${normalizedManufacturer}$`, $options: 'i' };
  }

  let medicine = await Medicine.findOne(searchQuery);
  if (medicine) return medicine;

  medicine = await Medicine.create({
    name: normalizedName,
    genericName: newMedicine.genericName?.trim(),
    manufacturer: normalizedManufacturer || 'Unknown',
    category: newMedicine.category || 'Other',
    dosageForm: newMedicine.dosageForm || 'Other',
    strength: newMedicine.strength?.trim(),
    prescriptionRequired: Boolean(newMedicine.prescriptionRequired),
    mrp: Number(newMedicine.mrp) || 0,
    description: newMedicine.description?.trim()
  });

  return medicine;
};

// Add stock item (pharmacy owner)
export const addStock = asyncHandler(async (req, res) => {
  const { medicineId, quantity, price, discount, batchNumber, expiryDate, newMedicine } = req.body;

  const pharmacy = await resolvePharmacyForUser(req);
  
  if (!pharmacy) {
    return sendError(res, 404, 'Pharmacy not found');
  }

  let medicine = await createOrFindMedicine(medicineId, newMedicine);
  if (!medicine) {
    return sendError(res, 404, 'Medicine not found');
  }

  const effectiveMedicineId = medicine._id;

  // Check if stock already exists for this medicine in this pharmacy
  const existingStock = await Stock.findOne({
    pharmacy: pharmacy._id,
    medicine: effectiveMedicineId
  });

  if (existingStock) {
    existingStock.quantity = Number(existingStock.quantity || 0) + Number(quantity || 0);
    if (price !== undefined) existingStock.price = price;
    if (discount !== undefined) existingStock.discount = discount;
    if (batchNumber !== undefined) existingStock.batchNumber = batchNumber;
    if (expiryDate !== undefined) existingStock.expiryDate = expiryDate;
    existingStock.isAvailable = existingStock.quantity > 0;
    await existingStock.save();
    await existingStock.populate('medicine');

    sendSuccess(res, 200, { stock: existingStock }, 'Stock updated successfully');

    setImmediate(async () => {
      try {
        await triggerAvailabilityAlerts(effectiveMedicineId, pharmacy._id, price);
      } catch (err) {
          logger.error('Error in background alert trigger:', err.message);
        }
    });

    return;
  }

  const stock = await Stock.create({
    pharmacy: pharmacy._id,
    medicine: effectiveMedicineId,
    quantity,
    price,
    discount: discount || 0,
    batchNumber,
    expiryDate,
    isAvailable: quantity > 0
  });

  await stock.populate('medicine');
  sendSuccess(res, 201, { stock }, 'Stock added successfully');

  setImmediate(async () => {
    try {
      await triggerAvailabilityAlerts(effectiveMedicineId, pharmacy._id, price);
    } catch (err) {
        logger.error('Error in background alert trigger:', err.message);
      }
  });
});

// Update stock item (pharmacy owner)
export const updateStock = asyncHandler(async (req, res) => {
  const { quantity, price, discount, batchNumber, expiryDate, isAvailable } = req.body;

  const pharmacy = await resolvePharmacyForUser(req);
  
  if (!pharmacy) {
    return sendError(res, 404, 'Pharmacy not found');
  }

  const stock = await Stock.findOne({
    _id: req.params.id,
    pharmacy: pharmacy._id
  });

  if (!stock) {
    return sendError(res, 404, 'Stock not found');
  }

  const previousPrice = stock.price;

  // Update stock
  if (quantity !== undefined) stock.quantity = quantity;
  if (price !== undefined) stock.price = price;
  if (discount !== undefined) stock.discount = discount;
  if (batchNumber !== undefined) stock.batchNumber = batchNumber;
  if (expiryDate !== undefined) stock.expiryDate = expiryDate;
  if (isAvailable !== undefined) stock.isAvailable = isAvailable;

  // Auto-update availability based on quantity
  if (quantity === 0) {
    stock.isAvailable = false;
  }

  await stock.save();
  await stock.populate('medicine');

  // Trigger price drop alerts if price decreased
  sendSuccess(res, 200, { stock }, 'Stock updated successfully');

  //Run price drop alerts in background
  if (price && price < previousPrice) {
    setImmediate(async () => {
      try {
        await triggerPriceDropAlerts(stock.medicine._id, pharmacy._id, price);
      } catch (err) {
          logger.error('Error in background price alert trigger:', err.message);
        }
    });
  }
});

// Delete stock item (pharmacy owner)
export const deleteStock = asyncHandler(async (req, res) => {
  const pharmacy = await resolvePharmacyForUser(req);
  
  if (!pharmacy) {
    return sendError(res, 404, 'Pharmacy not found');
  }

  const stock = await Stock.findOneAndDelete({
    _id: req.params.id,
    pharmacy: pharmacy._id
  });

  if (!stock) {
    return sendError(res, 404, 'Stock not found');
  }

  sendSuccess(res, 200, null, 'Stock deleted successfully');
});

// Bulk update stock (pharmacy owner)
export const bulkUpdateStock = asyncHandler(async (req, res) => {
  const { items } = req.body;

  const pharmacy = await resolvePharmacyForUser(req);
  
  if (!pharmacy) {
    return sendError(res, 404, 'Pharmacy not found');
  }

  const results = [];

  for (const item of items) {
    const { medicineId, quantity, price, discount, batchNumber, expiryDate } = item;

    let stock = await Stock.findOne({
      pharmacy: pharmacy._id,
      medicine: medicineId
    });

    if (stock) {
      // Update existing stock
      stock.quantity = quantity;
      stock.price = price;
      if (discount !== undefined) stock.discount = discount;
      if (batchNumber) stock.batchNumber = batchNumber;
      if (expiryDate) stock.expiryDate = expiryDate;
      stock.isAvailable = quantity > 0;
      await stock.save();
    } else {
      // Create new stock
      stock = await Stock.create({
        pharmacy: pharmacy._id,
        medicine: medicineId,
        quantity,
        price,
        discount: discount || 0,
        batchNumber,
        expiryDate,
        isAvailable: quantity > 0
      });
    }

    results.push(stock);
  }

  sendSuccess(res, 200, { updated: results.length }, 'Stock updated successfully');
});

// Helper function to trigger availability alerts
const triggerAvailabilityAlerts = async (medicineId, pharmacyId, price) => {
  try {
    const alerts = await Alert.find({
      medicine: medicineId,
      type: 'availability',
      isActive: true,
      isTriggered: false,
      $or: [
        { pharmacy: pharmacyId },
        { pharmacy: { $exists: false } },
        { pharmacy: null }
      ]
    });

    for (const alert of alerts) {
      alert.isTriggered = true;
      alert.triggeredAt = new Date();
      // In production, send notification here
      await alert.save();
    }
    } catch (error) {
    logger.error('Error triggering availability alerts:', error);
  }
};

// Helper function to trigger price drop alerts
const triggerPriceDropAlerts = async (medicineId, pharmacyId, newPrice) => {
  try {
    const alerts = await Alert.find({
      medicine: medicineId,
      type: 'price_drop',
      isActive: true,
      isTriggered: false,
      targetPrice: { $gte: newPrice }
    });

    for (const alert of alerts) {
      alert.isTriggered = true;
      alert.triggeredAt = new Date();
      // In production, send notification here
      await alert.save();
    }
    } catch (error) {
    logger.error('Error triggering price drop alerts:', error);
  }
};
