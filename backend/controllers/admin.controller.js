import User from '../models/User.js';
import Pharmacy from '../models/Pharmacy.js';
import Notification from '../models/Notification.js';
import Medicine from '../models/Medicine.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Stock from '../models/Stock.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/errorHandler.js';

// Get dashboard statistics
export const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalPatients,
    totalPharmacies,
    verifiedPharmacies,
    totalMedicines,
    totalOrders,
    pendingOrders,
    completedOrders,
    totalRevenue
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'patient' }),
    Pharmacy.countDocuments(),
    Pharmacy.countDocuments({ status: 'approved' }),
    Medicine.countDocuments({ isActive: true }),
    Order.countDocuments(),
    Order.countDocuments({ status: 'pending' }),
    Order.countDocuments({ status: 'delivered' }),
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ])
  ]);
  const users = await User.find();

  const pharmacies = await Pharmacy.find()
    .populate('owner');

  const orders = await Order.find()
    .populate('user')
    .populate('pharmacy')
    .populate('items.medicine');

  // Get recent orders
  const recentOrders = await Order.find()
    .populate('user', 'name email')
    .populate('pharmacy', 'name')
    .sort({ createdAt: -1 })
    .limit(5);

  // Get orders by status
  const ordersByStatus = await Order.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // Get monthly revenue (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyRevenue = await Order.aggregate([
    {
      $match: {
        paymentStatus: 'paid',
        createdAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        revenue: { $sum: '$total' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  sendSuccess(res, 200, {
    users: {
      total: totalUsers,
      patients: totalPatients
    },
    pharmacies: {
      total: totalPharmacies,
      verified: verifiedPharmacies
    },
    medicines: totalMedicines,
    orders: {
      total: totalOrders,
      pending: pendingOrders,
      completed: completedOrders,
      byStatus: ordersByStatus
    },
    revenue: {
      total: totalRevenue[0]?.total || 0,
      monthly: monthlyRevenue
    },
    recentOrders
  }, 'Dashboard statistics fetched successfully');
});

// Get all pharmacies (admin view with more details)
export const getAllPharmaciesAdmin = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, isVerified, isActive, search, status } = req.query;

  const query = {};

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  // Filter by status field (new schema standard)
  if (status) {
    if (status === 'approved') {
      query.status = 'approved';
    } else if (status === 'pending') {
      query.status = 'pending';
    } else if (status === 'rejected') {
      query.status = 'rejected';
    } else if (status === 'disabled') {
      query.status = 'disabled';
    } else {
      query.status = status;
    }
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { licenseNumber: { $regex: search, $options: 'i' } },
      { 'address.city': { $regex: search, $options: 'i' } }
    ];
  }

  const pharmacies = await Pharmacy.find(query)
    .populate('owner', 'name email phone')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await Pharmacy.countDocuments(query);

  // Get stock count for each pharmacy
  const pharmaciesWithStock = await Promise.all(
    pharmacies.map(async (pharmacy) => {
      const stockCount = await Stock.countDocuments({ pharmacy: pharmacy._id });
      const p = pharmacy.toObject();

      // Normalize status for legacy documents that still use isVerified
      if (!p.status) {
        p.status = 'pending';
      }

      // Compute isOpen dynamically:
      const now = new Date();
      let isOpen = true;

      // If permanently closed
      if (p.permanentClose) {
        isOpen = false;
      }

      // If temporarily closed until a future date
      if (p.tempCloseUntil && new Date(p.tempCloseUntil) > now) {
        isOpen = false;
      }

      // If still undecided, check operating hours (skip if already closed)
      if (isOpen) {
        const oh = p.operatingHours || {};
        if (oh.is24Hours) {
          isOpen = true;
        } else if (oh.open && oh.close) {
          const [openH, openM] = (oh.open || '00:00').split(':').map(Number);
          const [closeH, closeM] = (oh.close || '23:59').split(':').map(Number);
          const minutesNow = now.getHours() * 60 + now.getMinutes();
          const openMinutes = openH * 60 + openM;
          const closeMinutes = closeH * 60 + closeM;

          if (closeMinutes > openMinutes) {
            isOpen = minutesNow >= openMinutes && minutesNow < closeMinutes;
          } else {
            // overnight hours (e.g., open 20:00, close 04:00)
            isOpen = minutesNow >= openMinutes || minutesNow < closeMinutes;
          }
        }
      }

      return {
        ...p,
        stockCount,
        isOpen
      };
    })
  );

  sendSuccess(res, 200, {
    pharmacies: pharmaciesWithStock,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    }
  }, 'Pharmacies fetched successfully');
});

// Update pharmacy (admin)
export const updatePharmacyAdmin = asyncHandler(async (req, res) => {
  const { status, isActive, rating, rejectionReason, permanentClose, tempCloseUntil } = req.body;

  const update = {};
  if (typeof status !== 'undefined') update.status = status;
  if (typeof isActive !== 'undefined') update.isActive = isActive;
  if (typeof rating !== 'undefined') update.rating = rating;
  if (typeof permanentClose !== 'undefined') update.permanentClose = permanentClose;
  if (typeof tempCloseUntil !== 'undefined') update.tempCloseUntil = tempCloseUntil;

  // Handle rejection reason
  if (status === 'rejected' && rejectionReason) {
    update.rejectionReason = rejectionReason;
    update.isActive = false;
  } else if (status === 'approved') {
    // Clear rejection reason on approval
    update.rejectionReason = undefined;
  }

  const pharmacy = await Pharmacy.findByIdAndUpdate(
    req.params.id,
    update,
    { new: true, runValidators: true }
  ).populate('owner', 'name email phone');

  if (!pharmacy) {
    return sendError(res, 404, 'Pharmacy not found');
  }

  // Notify owner if rejection or approval
  if (status === 'rejected' && rejectionReason && pharmacy.owner) {
    await Notification.create({
      user: pharmacy.owner._id,
      title: 'Pharmacy application rejected',
      message: `Your pharmacy "${pharmacy.name}" was rejected. Reason: ${rejectionReason}`,
      type: 'general',
      link: `/pharmacy/profile`,
      meta: { pharmacyId: pharmacy._id }
    });
  } else if (status === 'approved' && pharmacy.owner) {
    await Notification.create({
      user: pharmacy.owner._id,
      title: 'Pharmacy approved',
      message: `Your pharmacy "${pharmacy.name}" has been approved and is now visible to customers.`,
      type: 'general',
      link: `/pharmacy/profile`,
      meta: { pharmacyId: pharmacy._id }
    });
  }

  sendSuccess(res, 200, { pharmacy }, 'Pharmacy updated successfully');
});

// Get all payments
export const getAllPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const query = {};

  if (status) {
    query.status = status;
  }

  const payments = await Payment.find(query)
    .populate('user', 'name email')
    .populate({
      path: 'order',
      populate: { path: 'pharmacy', select: 'name' }
    })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await Payment.countDocuments(query);

  sendSuccess(res, 200, {
    payments,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    }
  }, 'Payments fetched successfully');
});

// Get activity logs (simplified - in production, use proper logging)
export const getActivityLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  // Get recent user registrations
  const recentUsers = await User.find()
    .select('name email role createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

  // Get recent orders
  const recentOrders = await Order.find()
    .populate('user', 'name')
    .populate('pharmacy', 'name')
    .select('orderNumber status createdAt total')
    .sort({ createdAt: -1 })
    .limit(10);

  // Get recent pharmacy registrations
  const recentPharmacies = await Pharmacy.find()
    .select('name isVerified createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

  sendSuccess(res, 200, {
    recentUsers,
    recentOrders,
    recentPharmacies
  }, 'Activity logs fetched successfully');
});

// Seed sample medicines (admin utility)
export const seedMedicines = asyncHandler(async (req, res) => {
  const sampleMedicines = [
    { name: 'Paracetamol 500mg', genericName: 'Paracetamol', manufacturer: 'Cipla', category: 'Painkillers', mrp: 25, dosageForm: 'Tablet', prescriptionRequired: false },
    { name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', manufacturer: 'Sun Pharma', category: 'Antibiotics', mrp: 85, dosageForm: 'Capsule', prescriptionRequired: true },
    { name: 'Omeprazole 20mg', genericName: 'Omeprazole', manufacturer: 'Dr Reddy\'s', category: 'Antacids', mrp: 45, dosageForm: 'Capsule', prescriptionRequired: false },
    { name: 'Vitamin D3 60000IU', genericName: 'Cholecalciferol', manufacturer: 'Mankind', category: 'Vitamins', mrp: 120, dosageForm: 'Capsule', prescriptionRequired: false },
    { name: 'Metformin 500mg', genericName: 'Metformin', manufacturer: 'USV', category: 'Diabetes', mrp: 35, dosageForm: 'Tablet', prescriptionRequired: true },
    { name: 'Amlodipine 5mg', genericName: 'Amlodipine', manufacturer: 'Torrent', category: 'Blood Pressure', mrp: 55, dosageForm: 'Tablet', prescriptionRequired: true },
    { name: 'Aspirin 75mg', genericName: 'Aspirin', manufacturer: 'Bayer', category: 'Heart', mrp: 30, dosageForm: 'Tablet', prescriptionRequired: false },
    { name: 'Cetirizine 10mg', genericName: 'Cetirizine', manufacturer: 'Cipla', category: 'Allergies', mrp: 20, dosageForm: 'Tablet', prescriptionRequired: false },
    { name: 'Pantoprazole 40mg', genericName: 'Pantoprazole', manufacturer: 'Alkem', category: 'Digestive', mrp: 65, dosageForm: 'Tablet', prescriptionRequired: true },
    { name: 'Azithromycin 500mg', genericName: 'Azithromycin', manufacturer: 'Zydus', category: 'Antibiotics', mrp: 95, dosageForm: 'Tablet', prescriptionRequired: true },
    { name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', manufacturer: 'Abbott', category: 'Painkillers', mrp: 40, dosageForm: 'Tablet', prescriptionRequired: false },
    { name: 'Montelukast 10mg', genericName: 'Montelukast', manufacturer: 'Sun Pharma', category: 'Respiratory', mrp: 75, dosageForm: 'Tablet', prescriptionRequired: true },
    { name: 'Betamethasone Cream', genericName: 'Betamethasone', manufacturer: 'GSK', category: 'Skin', mrp: 85, dosageForm: 'Cream', prescriptionRequired: true },
    { name: 'Timolol Eye Drops', genericName: 'Timolol', manufacturer: 'Alcon', category: 'Eye Care', mrp: 110, dosageForm: 'Drops', prescriptionRequired: true },
    { name: 'Levothyroxine 50mcg', genericName: 'Levothyroxine', manufacturer: 'Abbott', category: 'Hormones', mrp: 60, dosageForm: 'Tablet', prescriptionRequired: true }
  ];

  // Check if medicines already exist
  const existingCount = await Medicine.countDocuments();
  if (existingCount > 0) {
    return sendError(res, 400, 'Medicines already exist in database');
  }

  await Medicine.insertMany(sampleMedicines);

  sendSuccess(res, 201, { count: sampleMedicines.length }, 'Sample medicines seeded successfully');
});

// Create admin user (one-time setup)
export const createAdminUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  // If this is a public setup call (no authenticated admin), only allow when no admin exists
  const existingAdmin = await User.findOne({ role: 'admin' });
  if (!req.user || req.user.role !== 'admin') {
    if (existingAdmin) {
      return sendError(res, 400, 'Admin user already exists');
    }
  }

  // If caller is an admin, allow creating additional admin users
  const admin = await User.create({
    name,
    email,
    password,
    phone: phone || '',
    role: 'admin',
    isVerified: true
  });

  sendSuccess(res, 201, { 
    user: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role
    }
  }, 'Admin user created successfully');
});
