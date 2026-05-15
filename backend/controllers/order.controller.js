import Order from '../models/Order.js';
import Pharmacy from '../models/Pharmacy.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/errorHandler.js';

// ================= GET MY ORDERS =================
export const getMyOrders = asyncHandler(async (req, res) => {

  const { page = 1, limit = 10, status, paymentStatus } = req.query;

  const query = {
    user: req.userId
  };

  if (status) {
    query.status = status;
  }

  if (paymentStatus) {
    query.paymentStatus = paymentStatus;
  }

  const orders = await Order.find(query)
    .populate('pharmacy', 'name address phone')
    .populate(
      'items.medicine',
      'name genericName manufacturer dosageForm'
    )
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await Order.countDocuments(query);

  sendSuccess(
    res,
    200,
    {
      orders,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    },
    'Orders fetched successfully'
  );
});

// ================= GET ORDER BY ID =================
export const getOrderById = asyncHandler(async (req, res) => {

  const order = await Order.findById(req.params.id)
    .populate('pharmacy', 'name address phone email')
    .populate('user', 'name email phone')
    .populate(
      'items.medicine',
      'name genericName manufacturer dosageForm strength'
    );

  if (!order) {
    return sendError(res, 404, 'Order not found');
  }

  const isOwner =
    order.user._id.toString() === req.userId;

  const isPharmacy =
    req.user.pharmacyId &&
    order.pharmacy._id.toString() ===
    req.user.pharmacyId.toString();

  const isAdmin =
    req.user.role === 'admin';

  if (!isOwner && !isPharmacy && !isAdmin) {
    return sendError(res, 403, 'Access denied');
  }

  sendSuccess(
    res,
    200,
    { order },
    'Order fetched successfully'
  );
});

// ================= CREATE ORDER =================
export const createOrder = asyncHandler(async (req, res) => {

  const {
    pharmacyId,
    items,
    deliveryType,
    deliveryAddress,
    notes,
    prescriptionImage,
    paymentMethod,
    paymentStatus,
    razorpayPaymentId
  } = req.body;

  // verify pharmacy
  const pharmacy = await Pharmacy.findById(pharmacyId);

  if (!pharmacy) {
    return sendError(res, 404, 'Pharmacy not found');
  }

  let subtotal = 0;

  const orderItems = [];

  for (const item of items) {

    // IMPORTANT:
    // use frontend fixed cart price
    const itemPrice = Math.round(item.price);

    orderItems.push({
      medicine: item.medicineId,
      quantity: item.quantity,
      price: itemPrice,
      discount: 0
    });

    subtotal += itemPrice * item.quantity;
  }

  const tax = Math.round(subtotal * 0.05);

  const deliveryCharge =
    deliveryType === 'delivery'
      ? 50
      : 0;

  const total =
    subtotal +
    tax +
    deliveryCharge;

  const orderNumber = `ORD${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

  const order = await Order.create({
    orderNumber,
    user: req.userId,
    pharmacy: pharmacyId,
    items: orderItems,
    subtotal,
    tax,
    deliveryCharge,
    total,
    status: 'pending',
    paymentStatus: paymentStatus || 'pending',
    paymentMethod: paymentMethod || 'cod',
    deliveryType,
    deliveryAddress,
    notes,
    prescriptionImage,
    razorpayPaymentId
  });

  await order.populate(
    'pharmacy',
    'name address phone'
  );

  await order.populate(
    'items.medicine',
    'name genericName'
  );

  sendSuccess(
    res,
    201,
    { order },
    'Order created successfully'
  );
});

// ================= UPDATE ORDER STATUS =================
export const updateOrderStatus = asyncHandler(async (req, res) => {

  const {
    status,
    estimatedDelivery
  } = req.body;

  const pharmacy = await Pharmacy.findOne({
    owner: req.userId
  });

  if (!pharmacy && req.user.role !== 'admin') {
    return sendError(res, 404, 'Pharmacy not found');
  }

  const query = {
    _id: req.params.id
  };

  if (req.user.role !== 'admin') {
    query.pharmacy = pharmacy._id;
  }

  const order = await Order.findOne(query);

  if (!order) {
    return sendError(res, 404, 'Order not found');
  }

  order.status = status;

  if (estimatedDelivery) {
    order.estimatedDelivery = estimatedDelivery;
  }

  await order.save();

  await order.populate(
    'pharmacy',
    'name address phone'
  );

  await order.populate(
    'items.medicine',
    'name'
  );

  sendSuccess(
    res,
    200,
    { order },
    'Order status updated successfully'
  );
});

// ================= PHARMACY ORDERS =================
export const getPharmacyOrders = asyncHandler(async (req, res) => {

  const {
    page = 1,
    limit = 10,
    status,
    paymentStatus
  } = req.query;

  const pharmacy = await Pharmacy.findOne({
    owner: req.userId
  });

  if (!pharmacy) {
    return sendError(res, 404, 'Pharmacy not found');
  }

  const query = {
    pharmacy: pharmacy._id
  };

  if (status) {
    query.status = status;
  }

  if (paymentStatus) {
    query.paymentStatus = paymentStatus;
  }

  const orders = await Order.find(query)
    .populate('user', 'name email phone')
    .populate('items.medicine', 'name genericName')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await Order.countDocuments(query);

  sendSuccess(
    res,
    200,
    {
      orders,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    },
    'Pharmacy orders fetched successfully'
  );
});

// ================= CANCEL ORDER =================
export const cancelOrder = asyncHandler(async (req, res) => {

  const order = await Order.findOne({
    _id: req.params.id,
    user: req.userId
  });

  if (!order) {
    return sendError(res, 404, 'Order not found');
  }

  if (order.status !== 'pending') {
    return sendError(
      res,
      400,
      'Only pending orders can be cancelled'
    );
  }

  order.status = 'cancelled';

  order.cancelledAt = new Date();

  order.cancelReason =
    req.body.reason ||
    'Cancelled by customer';

  await order.save();

  sendSuccess(
    res,
    200,
    { order },
    'Order cancelled successfully'
  );
});

// ================= ADMIN GET ALL ORDERS =================
export const getAllOrders = asyncHandler(async (req, res) => {

  const {
    page = 1,
    limit = 10,
    status,
    paymentStatus,
    pharmacyId,
    userId
  } = req.query;

  const query = {};

  if (status) {
    query.status = status;
  }

  if (paymentStatus) {
    query.paymentStatus = paymentStatus;
  }

  if (pharmacyId) {
    query.pharmacy = pharmacyId;
  }

  if (userId) {
    query.user = userId;
  }

  const orders = await Order.find(query)
    .populate('user', 'name email phone')
    .populate('pharmacy', 'name address')
    .populate('items.medicine', 'name')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await Order.countDocuments(query);

  sendSuccess(
    res,
    200,
    {
      orders,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    },
    'Orders fetched successfully'
  );
});