import Alert from '../models/Alert.js';
import Medicine from '../models/Medicine.js';
import Pharmacy from '../models/Pharmacy.js';
import Stock from '../models/Stock.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/errorHandler.js';

// Get my alerts
export const getMyAlerts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, type, isActive, isTriggered } = req.query;

  const query = { user: req.userId };

  if (type) {
    query.type = type;
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  if (isTriggered !== undefined) {
    query.isTriggered = isTriggered === 'true';
  }

  const alerts = await Alert.find(query)
    .populate('medicine', 'name genericName manufacturer mrp')
    .populate('pharmacy', 'name address')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const enrichedAlerts = await Promise.all(alerts.map(async (alert) => {
    const availableAt = await getAvailablePharmaciesForAlert(alert);
    return {
      ...alert.toObject(),
      isTriggered: alert.isTriggered || availableAt.length > 0,
      availableAt
    };
  }));

  const total = await Alert.countDocuments(query);

  sendSuccess(res, 200, {
    alerts: enrichedAlerts,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    }
  }, 'Alerts fetched successfully');
});

const getAvailablePharmaciesForAlert = async (alert) => {
  const query = {
    medicine: alert.medicine,
    quantity: { $gt: 0 },
    isAvailable: true
  };

  if (alert.pharmacy) {
    query.pharmacy = alert.pharmacy;
  }

  const stocks = await Stock.find(query)
    .populate('pharmacy', 'name address phone')
    .limit(5);

  return stocks
    .filter((stock) => stock.pharmacy)
    .map((stock) => ({
      _id: stock.pharmacy._id,
      name: stock.pharmacy.name,
      address: stock.pharmacy.address,
      phone: stock.pharmacy.phone,
      quantity: stock.quantity,
      price: stock.price,
      discount: stock.discount
    }));
};

// Create alert
export const createAlert = asyncHandler(async (req, res) => {
  const { medicineId, pharmacyId, type, targetPrice, notificationMethod } = req.body;

  // Verify medicine exists
  const medicine = await Medicine.findById(medicineId);
  if (!medicine) {
    return sendError(res, 404, 'Medicine not found');
  }

  // Verify pharmacy if provided
  if (pharmacyId) {
    const pharmacy = await Pharmacy.findById(pharmacyId);
    if (!pharmacy) {
      return sendError(res, 404, 'Pharmacy not found');
    }
  }

  // Check for duplicate alert
  const existingAlert = await Alert.findOne({
    user: req.userId,
    medicine: medicineId,
    pharmacy: pharmacyId || null,
    type: type || 'availability',
    isActive: true
  });

  if (existingAlert) {
    return sendError(res, 400, 'Alert already exists for this medicine');
  }

  const alert = await Alert.create({
    user: req.userId,
    medicine: medicineId,
    pharmacy: pharmacyId,
    type: type || 'availability',
    targetPrice,
    notificationMethod: notificationMethod || 'email'
  });

  const availableAt = await getAvailablePharmaciesForAlert(alert);
  if (availableAt.length > 0) {
    alert.isTriggered = true;
    alert.triggeredAt = new Date();
    await alert.save();
  }

  await alert.populate('medicine', 'name genericName manufacturer mrp');
  await alert.populate('pharmacy', 'name address');

  sendSuccess(res, 201, { alert: { ...alert.toObject(), availableAt } }, 'Alert created successfully');
});

// Update alert
export const updateAlert = asyncHandler(async (req, res) => {
  const { targetPrice, isActive, notificationMethod } = req.body;

  const alert = await Alert.findOne({
    _id: req.params.id,
    user: req.userId
  });

  if (!alert) {
    return sendError(res, 404, 'Alert not found');
  }

  if (targetPrice !== undefined) alert.targetPrice = targetPrice;
  if (isActive !== undefined) alert.isActive = isActive;
  if (notificationMethod) alert.notificationMethod = notificationMethod;

  await alert.save();
  await alert.populate('medicine', 'name genericName manufacturer mrp');
  await alert.populate('pharmacy', 'name address');

  sendSuccess(res, 200, { alert }, 'Alert updated successfully');
});

// Delete alert
export const deleteAlert = asyncHandler(async (req, res) => {
  const alert = await Alert.findOneAndDelete({
    _id: req.params.id,
    user: req.userId
  });

  if (!alert) {
    return sendError(res, 404, 'Alert not found');
  }

  sendSuccess(res, 200, null, 'Alert deleted successfully');
});

// Mark alert as read/acknowledged
export const acknowledgeAlert = asyncHandler(async (req, res) => {
  const alert = await Alert.findOne({
    _id: req.params.id,
    user: req.userId
  });

  if (!alert) {
    return sendError(res, 404, 'Alert not found');
  }

  alert.isActive = false;
  await alert.save();

  sendSuccess(res, 200, { alert }, 'Alert acknowledged');
});

// Get triggered alerts count
export const getTriggeredAlertsCount = asyncHandler(async (req, res) => {
  const count = await Alert.countDocuments({
    user: req.userId,
    isTriggered: true,
    isActive: true
  });

  sendSuccess(res, 200, { count }, 'Triggered alerts count fetched');
});
