import Order from '../models/Order.js';
import Stock from '../models/Stock.js';
import Pharmacy from '../models/Pharmacy.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/errorHandler.js';

// Get my orders (patient)
export const getMyOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, paymentStatus } = req.query;

  const query = { user: req.userId };

  if (status) {
    query.status = status;
  }

  if (paymentStatus) {
    query.paymentStatus = paymentStatus;
  }

  const orders = await Order.find(query)
    .populate('pharmacy', 'name address phone')
    .populate('items.medicine', 'name genericName manufacturer dosageForm')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await Order.countDocuments(query);

  sendSuccess(res, 200, {
    orders,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    }
  }, 'Orders fetched successfully');
});

// Get order by ID
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('pharmacy', 'name address phone email')
    .populate('user', 'name email phone')
    .populate('items.medicine', 'name genericName manufacturer dosageForm strength');

  if (!order) {
    return sendError(res, 404, 'Order not found');
  }

  // Check authorization
  const isOwner = order.user._id.toString() === req.userId;
  const isPharmacy = req.user.pharmacyId && 
    order.pharmacy._id.toString() === req.user.pharmacyId.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isPharmacy && !isAdmin) {
    return sendError(res, 403, 'Access denied');
  }

  sendSuccess(res, 200, { order }, 'Order fetched successfully');
});

// Create order
export const createOrder = asyncHandler(async (req, res) => {
  const { 
    pharmacyId, 
    items, 
    deliveryType, 
    deliveryAddress, 
    notes,
    prescriptionImage,
    paymentMethod 
  } = req.body;

  // Verify pharmacy
  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy || !pharmacy.isActive || !pharmacy.isVerified) {
    return sendError(res, 400, 'Pharmacy not available');
  }

  // Process items and calculate totals
  let subtotal = 0;
  const orderItems = [];

  for (const item of items) {
    const stock = await Stock.findOne({
      pharmacy: pharmacyId,
      medicine: item.medicineId,
      isAvailable: true
    }).populate('medicine');

    if (!stock) {
      return sendError(res, 400, `Medicine not available: ${item.medicineId}`);
    }

    if (stock.quantity < item.quantity) {
      return sendError(res, 400, `Insufficient stock for ${stock.medicine.name}`);
    }

    const itemPrice = stock.price;
    const itemDiscount = stock.discount || 0;
    const itemTotal = (itemPrice - (itemPrice * itemDiscount / 100)) * item.quantity;

    orderItems.push({
      medicine: item.medicineId,
      quantity: item.quantity,
      price: itemPrice,
      discount: itemDiscount
    });

    subtotal += itemTotal;
  }

  // Calculate tax and delivery
  const tax = subtotal * 0.05; // 5% tax
  const deliveryCharge = deliveryType === 'delivery' ? 50 : 0;
  const total = subtotal + tax + deliveryCharge;

  // Create order
  const order = await Order.create({
    user: req.userId,
    pharmacy: pharmacyId,
    items: orderItems,
    subtotal,
    tax,
    deliveryCharge,
    total,
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: paymentMethod || 'razorpay',
    deliveryType,
    deliveryAddress,
    notes,
    prescriptionImage
  });

  await order.populate('pharmacy', 'name address phone');
  await order.populate('items.medicine', 'name genericName');

  sendSuccess(res, 201, { order }, 'Order created successfully');
});

// Update order status (pharmacy)
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, estimatedDelivery } = req.body;

  const pharmacy = await Pharmacy.findOne({ owner: req.userId });
  
  if (!pharmacy && req.user.role !== 'admin') {
    return sendError(res, 404, 'Pharmacy not found');
  }

  const query = { _id: req.params.id };
  if (req.user.role !== 'admin') {
    query.pharmacy = pharmacy._id;
  }

  const order = await Order.findOne(query);

  if (!order) {
    return sendError(res, 404, 'Order not found');
  }

  // Validate status transitions
  const validTransitions = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['processing', 'cancelled'],
    'processing': ['ready', 'cancelled'],
    'ready': ['out_for_delivery', 'delivered', 'cancelled'],
    'out_for_delivery': ['delivered', 'cancelled'],
    'delivered': [],
    'cancelled': []
  };

  if (!validTransitions[order.status].includes(status)) {
    return sendError(res, 400, `Cannot change status from ${order.status} to ${status}`);
  }

  order.status = status;
  
  if (status === 'delivered') {
    order.deliveredAt = new Date();
    
    // Update stock quantities
    for (const item of order.items) {
      await Stock.findOneAndUpdate(
        { pharmacy: order.pharmacy, medicine: item.medicine },
        { $inc: { quantity: -item.quantity } }
      );
    }
  }

  if (status === 'cancelled') {
    order.cancelledAt = new Date();
    if (req.body.cancelReason) {
      order.cancelReason = req.body.cancelReason;
    }
  }

  if (estimatedDelivery) {
    order.estimatedDelivery = estimatedDelivery;
  }

  await order.save();
  await order.populate('pharmacy', 'name address phone');
  await order.populate('items.medicine', 'name');

  sendSuccess(res, 200, { order }, 'Order status updated successfully');
});

// Get pharmacy orders
export const getPharmacyOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, paymentStatus, date } = req.query;

  const pharmacy = await Pharmacy.findOne({ owner: req.userId });
  
  if (!pharmacy) {
    return sendError(res, 404, 'Pharmacy not found');
  }

  const query = { pharmacy: pharmacy._id };

  if (status) {
    query.status = status;
  }

  if (paymentStatus) {
    query.paymentStatus = paymentStatus;
  }

  if (date) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    query.createdAt = { $gte: startDate, $lt: endDate };
  }

  const orders = await Order.find(query)
    .populate('user', 'name email phone')
    .populate('items.medicine', 'name genericName')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await Order.countDocuments(query);

  sendSuccess(res, 200, {
    orders,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    }
  }, 'Pharmacy orders fetched successfully');
});

// Cancel order (patient - only if pending)
export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    user: req.userId
  });

  if (!order) {
    return sendError(res, 404, 'Order not found');
  }

  if (order.status !== 'pending') {
    return sendError(res, 400, 'Only pending orders can be cancelled');
  }

  order.status = 'cancelled';
  order.cancelledAt = new Date();
  order.cancelReason = req.body.reason || 'Cancelled by customer';
  await order.save();

  sendSuccess(res, 200, { order }, 'Order cancelled successfully');
});

// Get all orders (admin)
export const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, paymentStatus, pharmacyId, userId } = req.query;

  const query = {};

  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (pharmacyId) query.pharmacy = pharmacyId;
  if (userId) query.user = userId;

  const orders = await Order.find(query)
    .populate('user', 'name email phone')
    .populate('pharmacy', 'name address')
    .populate('items.medicine', 'name')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await Order.countDocuments(query);

  sendSuccess(res, 200, {
    orders,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    }
  }, 'Orders fetched successfully');
});
