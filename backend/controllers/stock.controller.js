import Stock from '../models/Stock.js';
import Medicine from '../models/Medicine.js';
import Pharmacy from '../models/Pharmacy.js';
import Alert from '../models/Alert.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/errorHandler.js';

// Get my pharmacy stock (pharmacy owner)
// GET /api/stock/
export const getMyStock = asyncHandler(async (req, res) => {
  const pharmacy = await Pharmacy.findOne({ owner: req.userId });

  if (!pharmacy) {
    return sendError(res, 404, 'Pharmacy not found');
  }

  const stock = await Stock.find({ pharmacy: pharmacy._id })
    .populate('medicine')
    .sort({ createdAt: -1 });

  sendSuccess(
    res,
    200,
    {
      stock
    },
    'Stock fetched successfully'
  );
});

// Add stock item (pharmacy owner)
export const addStock = asyncHandler(async (req, res) => {
  const { medicineId, quantity, price, discount, batchNumber, expiryDate } = req.body;

  const pharmacy = await Pharmacy.findOne({ owner: req.userId });
  
  if (!pharmacy) {
    return sendError(res, 404, 'Pharmacy not found');
  }

  // Check if medicine exists
  const medicine = await Medicine.findById(medicineId);
  if (!medicine) {
    return sendError(res, 404, 'Medicine not found');
  }

  // Check if stock already exists for this medicine in this pharmacy
  const existingStock = await Stock.findOne({
    pharmacy: pharmacy._id,
    medicine: medicineId
  });

  if (existingStock) {
    return sendError(res, 400, 'Stock for this medicine already exists. Use update instead.');
  }

  const stock = await Stock.create({
    pharmacy: pharmacy._id,
    medicine: medicineId,
    quantity,
    price,
    discount: discount || 0,
    batchNumber,
    expiryDate,
    isAvailable: quantity > 0
  });

  // Trigger alerts for users waiting for this medicine
  await stock.populate('medicine');

  // FIXED: Send response immediately, then process alerts in background
  // The pharmacy owner gets instant feedback; alerts run after
  sendSuccess(res, 201, { stock }, 'Stock added successfully');

  // Process alerts asynchronously — runs after response is sent
  setImmediate(async () => {
    try {
      await triggerAvailabilityAlerts(medicineId, pharmacy._id, price);
    } catch (err) {
      console.error('Error in background alert trigger:', err.message);
    }
  });
});

// Update stock item (pharmacy owner)
export const updateStock = asyncHandler(async (req, res) => {
  const { quantity, price, discount, batchNumber, expiryDate, isAvailable } = req.body;

  const pharmacy = await Pharmacy.findOne({ owner: req.userId });
  
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
        console.error('Error in background price alert trigger:', err.message);
      }
    });
  }
});

// Delete stock item (pharmacy owner)
export const deleteStock = asyncHandler(async (req, res) => {
  const pharmacy = await Pharmacy.findOne({ owner: req.userId });
  
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

  const pharmacy = await Pharmacy.findOne({ owner: req.userId });
  
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
    console.error('Error triggering availability alerts:', error);
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
    console.error('Error triggering price drop alerts:', error);
  }
};
