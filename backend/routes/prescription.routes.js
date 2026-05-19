// backend/routes/prescription.routes.js
import express from 'express';
import multer from 'multer';
import Prescription from '../models/Prescription.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Medicine from '../models/Medicine.js';
import Notification from '../models/Notification.js';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError, asyncHandler } from '../utils/errorHandler.js';
import cloudinary from '../config/cloudinaryConfig.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'));
    }
  }
});

const uploadToCloudinary = async (file) => {
  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'prescriptions',
    resource_type: 'auto'
  });
  return result;
};

// POST /api/prescriptions/upload
// Patient uploads prescription for an order
router.post('/upload', authMiddleware, requireRole('patient'), upload.single('prescription'),
  asyncHandler(async (req, res) => {
    const { orderId } = req.body;
    if (!req.file) return sendError(res, 400, 'Prescription file is required');

    let order;
    let pharmacyId;

    if (orderId) {
      order = await Order.findById(orderId).populate('pharmacy');
      if (!order) return sendError(res, 404, 'Order not found');
      if (order.user.toString() !== req.userId) return sendError(res, 403, 'Access denied');
      pharmacyId = order.pharmacy?._id;
    }

    const uploadResult = await uploadToCloudinary(req.file);
    const imageUrl = uploadResult.secure_url;

    const prescription = await Prescription.create({
      order: orderId || undefined,
      patient: req.userId,
      pharmacy: pharmacyId,
      imageUrl,
      cloudinaryId: uploadResult.public_id
    });

    if (order) {
      order.prescriptionImage = imageUrl;
      order.prescriptionStatus = 'pending';
      await order.save();
    }

    const admins = await User.find({ role: 'admin', isActive: true }).select('_id name');
    if (admins.length > 0) {
      const notifications = admins.map((admin) => ({
        user: admin._id,
        title: 'New Prescription Uploaded',
        message: `${req.user?.name || 'A patient'} uploaded a prescription${order ? ` for order #${order._id.slice(-8).toUpperCase()}` : ''}.`,
        type: 'prescription',
        link: '/admin/prescriptions',
        meta: {
          prescriptionId: prescription._id,
          orderId: order?._id
        }
      }));
      await Notification.insertMany(notifications);
    }

    const medicineQuery = { isActive: true };
    if (order?.items?.length) {
      const orderedIds = order.items.map((item) => item.medicine?.toString()).filter(Boolean);
      if (orderedIds.length) medicineQuery._id = { $nin: orderedIds };
    }
    const medicineSuggestions = await Medicine.find(medicineQuery)
      .limit(5)
      .select('name genericName category mrp');

    sendSuccess(res, 201, { prescription, suggestions: medicineSuggestions }, 'Prescription uploaded successfully.');
  })
);

// GET /api/prescriptions/pharmacy  — pharmacy sees all pending prescriptions
router.get('/pharmacy', authMiddleware, requireRole('pharmacy'),
  asyncHandler(async (req, res) => {
    const pharmacyId = req.user.pharmacyId;
    const prescriptions = await Prescription.find({ pharmacy: pharmacyId })
      .populate('patient', 'name email phone')
      .populate('order', 'orderNumber totalAmount')
      .sort({ createdAt: -1 });
    sendSuccess(res, 200, { prescriptions }, 'Prescriptions fetched');
  })
);

// GET /api/prescriptions/admin  — admin sees all prescriptions
router.get('/admin', authMiddleware, requireRole('admin'),
  asyncHandler(async (req, res) => {
    const prescriptions = await Prescription.find()
      .populate('patient', 'name email phone')
      .populate('order', 'orderNumber totalAmount status')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });
    sendSuccess(res, 200, { prescriptions }, 'Prescription uploads fetched');
  })
);

// PATCH /api/prescriptions/:id/review  — pharmacy approves or rejects
router.patch('/:id/review', authMiddleware, requireRole('pharmacy'),
  asyncHandler(async (req, res) => {
    const { status, rejectionReason } = req.body;
    if (!['approved', 'rejected'].includes(status)) return sendError(res, 400, 'Invalid status');

    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return sendError(res, 404, 'Prescription not found');

    prescription.status = status;
    prescription.reviewedBy = req.userId;
    prescription.reviewedAt = new Date();
    if (status === 'rejected') prescription.rejectionReason = rejectionReason;
    await prescription.save();

    const order = await Order.findById(prescription.order);
    if (order) {
      order.prescriptionStatus = status;
      if (status === 'approved') order.status = 'confirmed';
      if (status === 'rejected') order.status = 'cancelled';
      await order.save();
    }

    sendSuccess(res, 200, { prescription }, `Prescription ${status}`);
  })
);

// GET /api/prescriptions/my  — patient views their prescriptions
router.get('/my', authMiddleware, requireRole('patient'),
  asyncHandler(async (req, res) => {
    const prescriptions = await Prescription.find({ patient: req.userId })
      .populate('order', 'orderNumber totalAmount status')
      .populate('pharmacy', 'name')
      .sort({ createdAt: -1 });
    sendSuccess(res, 200, { prescriptions }, 'Your prescriptions');
  })
);

export default router;
