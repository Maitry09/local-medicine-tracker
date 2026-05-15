// backend/routes/prescription.routes.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Prescription from '../models/Prescription.js';
import Order from '../models/Order.js';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError, asyncHandler } from '../utils/errorHandler.js';

const router = express.Router();

// Multer setup – saves to backend/uploads/prescriptions/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/prescriptions';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `rx_${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'));
    }
  }
});

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

    const imageUrl = `/uploads/prescriptions/${req.file.filename}`;

    const prescription = await Prescription.create({
      order: orderId || undefined,
      patient: req.userId,
      pharmacy: pharmacyId,
      imageUrl
    });

    if (order) {
      order.prescriptionImage = imageUrl;
      order.prescriptionStatus = 'pending';
      await order.save();
    }

    sendSuccess(res, 201, { prescription }, 'Prescription uploaded successfully.');
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

    // Update order status accordingly
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
