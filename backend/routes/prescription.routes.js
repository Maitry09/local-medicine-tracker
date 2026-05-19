// backend/routes/prescription.routes.js
import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import Prescription from '../models/Prescription.js';
import Order from '../models/Order.js';
import Stock from '../models/Stock.js';
import User from '../models/User.js';
import Medicine from '../models/Medicine.js';
import Pharmacy from '../models/Pharmacy.js';
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
        message: 'A prescription was uploaded.',
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

    let pharmacySuggestions = [];
    const addUniquePharmacy = (pharmacy) => {
      if (!pharmacy) return;
      const exists = pharmacySuggestions.some((p) => p._id.toString() === pharmacy._id.toString());
      if (!exists) pharmacySuggestions.push(pharmacy);
    };

    if (order?.pharmacy) {
      addUniquePharmacy(order.pharmacy);
    }

    const patientCoordinates = req.user?.address?.coordinates;
    if (patientCoordinates?.lat && patientCoordinates?.lng) {
      const nearbyPharmacies = await Pharmacy.find({
        isActive: true,
        status: 'approved',
        'address.location': {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [patientCoordinates.lng, patientCoordinates.lat]
            },
            $maxDistance: 30000
          }
        }
      })
        .limit(5)
        .select('name address phone rating');
      nearbyPharmacies.forEach(addUniquePharmacy);
    }

    if (!pharmacySuggestions.length) {
      const topPharmacies = await Pharmacy.find({
        isActive: true,
        status: 'approved'
      })
        .sort({ rating: -1, createdAt: -1 })
        .limit(5)
        .select('name address phone rating');
      pharmacySuggestions = topPharmacies;
    }

    sendSuccess(res, 201, {
      prescription,
      suggestions: {
        medicines: medicineSuggestions,
        pharmacies: pharmacySuggestions
      }
    }, 'Prescription uploaded successfully.');
  })
);

const getUserPharmacy = async (req) => {
  if (req.user.pharmacyId) {
    return await Pharmacy.findById(req.user.pharmacyId);
  }
  return await Pharmacy.findOne({ owner: req.userId });
};

// GET /api/prescriptions/pharmacy  — pharmacy sees all prescriptions and responses
router.get('/pharmacy', authMiddleware, requireRole('pharmacy'),
  asyncHandler(async (req, res) => {
    const pharmacy = await getUserPharmacy(req);
    if (!pharmacy) return sendError(res, 404, 'Pharmacy not found');

    const query = {};
    if (req.query.status && ['pending', 'approved', 'rejected'].includes(req.query.status)) {
      query.status = req.query.status;
    }

    const prescriptions = await Prescription.find(query)
      .populate('patient', 'name email phone')
      .populate('order', 'orderNumber totalAmount status')
      .populate({ path: 'responses.pharmacy', select: 'name' })
      .populate({ path: 'responses.suggestedMedicines.medicine', select: 'name genericName category' })
      .sort({ createdAt: -1 });

    sendSuccess(res, 200, { prescriptions }, 'Prescriptions fetched');
  })
);

// GET /api/prescriptions/admin  — admin sees all prescriptions with response metadata
router.get('/admin', authMiddleware, requireRole('admin'),
  asyncHandler(async (req, res) => {
    const prescriptions = await Prescription.find()
      .populate('patient', 'name email phone')
      .populate('order', 'orderNumber totalAmount status')
      .populate('reviewedBy', 'name')
      .populate({ path: 'responses.pharmacy', select: 'name' })
      .populate({ path: 'responses.suggestedMedicines.medicine', select: 'name genericName category' })
      .sort({ createdAt: -1 });
    sendSuccess(res, 200, { prescriptions }, 'Prescription uploads fetched');
  })
);

// GET /api/prescriptions/my  — patient views their prescriptions and pharmacy responses
router.get('/my', authMiddleware, requireRole('patient'),
  asyncHandler(async (req, res) => {
    const prescriptions = await Prescription.find({ patient: req.userId })
      .populate('order', 'orderNumber totalAmount status')
      .populate('pharmacy', 'name')
      .populate({ path: 'responses.pharmacy', select: 'name' })
      .populate({ path: 'responses.suggestedMedicines.medicine', select: 'name genericName category' })
      .sort({ createdAt: -1 });
    sendSuccess(res, 200, { prescriptions }, 'Your prescriptions');
  })
);

// GET /api/prescriptions/:id — fetch prescription details for patient, pharmacy, or admin
router.get('/:id', authMiddleware,
  asyncHandler(async (req, res) => {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patient', 'name email phone')
      .populate('pharmacy', 'name address phone')
      .populate('order', 'orderNumber totalAmount status')
      .populate('reviewedBy', 'name')
      .populate({ path: 'responses.pharmacy', select: 'name' })
      .populate({ path: 'responses.suggestedMedicines.medicine', select: 'name genericName category' });

    if (!prescription) return sendError(res, 404, 'Prescription not found');

    const isPatient = prescription.patient._id.toString() === req.userId;
    const isAdmin = req.user?.role === 'admin';
    let isPharmacy = false;
    if (req.user?.role === 'pharmacy') {
      const pharmacy = await getUserPharmacy(req);
      if (pharmacy) {
        isPharmacy = prescription.pharmacy === null ||
          prescription.pharmacy?.toString() === pharmacy._id.toString() ||
          prescription.responses.some((resp) => resp.pharmacy?.toString() === pharmacy._id.toString());
      }
    }

    if (!isPatient && !isAdmin && !isPharmacy) {
      return sendError(res, 403, 'Access denied');
    }

    sendSuccess(res, 200, { prescription }, 'Prescription fetched successfully');
  })
);

// POST /api/prescriptions/:id/respond — pharmacy responds with suggestions
router.post('/:id/respond', authMiddleware, requireRole('pharmacy'),
  asyncHandler(async (req, res) => {
    const { message, pricingDetails, suggestedMedicines = [] } = req.body;
    const pharmacy = await getUserPharmacy(req);
    if (!pharmacy) return sendError(res, 404, 'Pharmacy not found');

    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return sendError(res, 404, 'Prescription not found');

    const validationIds = Array.isArray(suggestedMedicines)
      ? suggestedMedicines
          .map((item) => item.medicineId)
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
      : [];

    let stockMap = {};
    if (validationIds.length > 0) {
      const stockItems = await Stock.find({
        pharmacy: pharmacy._id,
        medicine: { $in: validationIds }
      }).populate('medicine', 'name genericName');
      stockMap = stockItems.reduce((acc, stock) => {
        acc[stock.medicine._id.toString()] = stock;
        return acc;
      }, {});
    }

    const responseEntry = {
      pharmacy: pharmacy._id,
      pharmacyName: pharmacy.name,
      status: ['approved', 'rejected', 'submitted'].includes(req.body.status)
        ? req.body.status
        : 'submitted',
      message: message?.trim() || '',
      pricingDetails: pricingDetails?.trim() || '',
      suggestedMedicines: Array.isArray(suggestedMedicines)
        ? suggestedMedicines.map((item) => {
            const medicineId = mongoose.Types.ObjectId.isValid(item.medicineId) ? item.medicineId : undefined;
            const stockItem = medicineId ? stockMap[medicineId.toString()] : null;

            return {
              medicine: stockItem ? stockItem.medicine._id : medicineId,
              name: item.name || stockItem?.medicine?.name || '',
              available: Boolean(item.available) || Boolean(stockItem?.quantity > 0),
              price: Number(item.price || stockItem?.price || 0),
              note: item.note ? item.note.trim() : ''
            };
          }).filter((item) => item.name || item.medicine)
        : []
    };

    const existingIndex = prescription.responses.findIndex((resp) => resp.pharmacy.toString() === pharmacy._id.toString());
    if (existingIndex >= 0) {
      prescription.responses[existingIndex] = { ...prescription.responses[existingIndex].toObject(), ...responseEntry, createdAt: new Date() };
    } else {
      prescription.responses.push(responseEntry);
    }

    await prescription.save();
    await prescription.populate({ path: 'responses.pharmacy', select: 'name' });
    await prescription.populate({ path: 'responses.suggestedMedicines.medicine', select: 'name genericName category' });

    await Notification.create({
      user: prescription.patient,
      title: `${pharmacy.name} responded to your prescription request`,
      message: `A pharmacy has suggested medicines for your prescription. View their response in your dashboard.`,
      type: 'prescription',
      link: '/dashboard'
    });

    sendSuccess(res, 200, { prescription }, 'Response submitted successfully');
  })
);

// PATCH /api/prescriptions/:id/review  — pharmacy approves or rejects
router.patch('/:id/review', authMiddleware, requireRole('pharmacy'),
  asyncHandler(async (req, res) => {
    const { status, message, pricingDetails } = req.body;
    if (!['approved', 'rejected'].includes(status)) return sendError(res, 400, 'Invalid status');

    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return sendError(res, 404, 'Prescription not found');

    const pharmacy = await getUserPharmacy(req);
    if (!pharmacy) return sendError(res, 404, 'Pharmacy not found');

    const responseEntry = {
      pharmacy: pharmacy._id,
      pharmacyName: pharmacy.name,
      status,
      message: message?.trim() || '',
      pricingDetails: pricingDetails?.trim() || '',
      suggestedMedicines: []
    };

    const existingIndex = prescription.responses.findIndex((resp) => resp.pharmacy.toString() === pharmacy._id.toString());
    if (existingIndex >= 0) {
      prescription.responses[existingIndex] = { ...prescription.responses[existingIndex].toObject(), ...responseEntry, createdAt: new Date() };
    } else {
      prescription.responses.push(responseEntry);
    }

    prescription.status = status;
    prescription.reviewedBy = req.userId;
    prescription.reviewedAt = new Date();

    await prescription.save();
    await prescription.populate({ path: 'responses.pharmacy', select: 'name' });
    await prescription.populate({ path: 'responses.suggestedMedicines.medicine', select: 'name genericName category' });

    sendSuccess(res, 200, { prescription }, `Prescription ${status}`);
  })
);

export default router;
