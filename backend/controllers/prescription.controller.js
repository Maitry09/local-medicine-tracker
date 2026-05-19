import Prescription from '../models/Prescription.js';
import Order from '../models/Order.js';
import Pharmacy from '../models/Pharmacy.js';
import Notification from '../models/Notification.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/errorHandler.js';
import path from 'path';
import fs from 'fs';

// Upload prescription (patient)
// POST /api/prescriptions/upload
export const uploadPrescription = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendError(res, 400, 'No prescription image uploaded');
  }

  const { pharmacyId, orderId, doctorName, hospitalName, prescriptionDate, notes } = req.body;

  const imageUrl = `/uploads/prescriptions/${req.file.filename}`;

  const prescription = await Prescription.create({
    patient: req.userId,
    pharmacy: pharmacyId || undefined,
    order: orderId || undefined,
    imageUrl,
    originalName: req.file.originalname,
    doctorName,
    hospitalName,
    prescriptionDate: prescriptionDate ? new Date(prescriptionDate) : undefined,
    notes,
    status: 'pending'
  });

  await prescription.populate('patient', 'name email phone');
  if (prescription.pharmacy) await prescription.populate('pharmacy', 'name address');
  if (prescription.order) await prescription.populate('order', 'orderNumber total');

  // Notify pharmacy if linked
  if (pharmacyId) {
    const pharmacy = await Pharmacy.findById(pharmacyId).populate('owner', '_id');
    if (pharmacy && pharmacy.owner) {
      await Notification.create({
        user: pharmacy.owner._id,
        title: 'New Prescription Uploaded',
        message: 'A patient has uploaded a prescription.',
        type: 'prescription',
        link: `/pharmacy/prescriptions/${prescription._id}`
      });
    }
  }

  sendSuccess(res, 201, { prescription }, 'Prescription uploaded successfully');
});

// Get my prescriptions (patient)
// GET /api/prescriptions/my
export const getMyPrescriptions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const query = { patient: req.userId };
  if (status) query.status = status;

  const prescriptions = await Prescription.find(query)
    .populate('pharmacy', 'name address phone')
    .populate('order', 'orderNumber total status')
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Prescription.countDocuments(query);

  sendSuccess(res, 200, {
    prescriptions,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    }
  }, 'Prescriptions fetched successfully');
});

// Get pharmacy prescriptions (pharmacy owner)
// GET /api/prescriptions/pharmacy
export const getPharmacyPrescriptions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const pharmacy = await Pharmacy.findOne({ owner: req.userId });
  if (!pharmacy) return sendError(res, 404, 'Pharmacy not found');

  const query = { pharmacy: pharmacy._id };
  if (status) query.status = status;

  const prescriptions = await Prescription.find(query)
    .populate('patient', 'name email phone')
    .populate('order', 'orderNumber total status')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Prescription.countDocuments(query);

  sendSuccess(res, 200, {
    prescriptions,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    }
  }, 'Prescriptions fetched successfully');
});

// Get prescription by ID
// GET /api/prescriptions/:id
export const getPrescriptionById = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate('patient', 'name email phone')
    .populate('pharmacy', 'name address phone')
    .populate('order', 'orderNumber total status items')
    .populate('reviewedBy', 'name');

  if (!prescription) return sendError(res, 404, 'Prescription not found');

  // Check access
  const isPatient = prescription.patient._id.toString() === req.userId;
  const isAdmin = req.user?.role === 'admin';
  let isPharmacy = false;
  if (req.user?.role === 'pharmacy') {
    const pharmacy = await Pharmacy.findOne({ owner: req.userId });
    isPharmacy = pharmacy && prescription.pharmacy &&
      pharmacy._id.toString() === prescription.pharmacy._id.toString();
  }

  if (!isPatient && !isAdmin && !isPharmacy) {
    return sendError(res, 403, 'Access denied');
  }

  sendSuccess(res, 200, { prescription }, 'Prescription fetched successfully');
});

// Approve prescription (pharmacy)
// PATCH /api/prescriptions/:id/approve
export const approvePrescription = asyncHandler(async (req, res) => {
  const pharmacy = await Pharmacy.findOne({ owner: req.userId });
  if (!pharmacy) return sendError(res, 404, 'Pharmacy not found');

  const prescription = await Prescription.findOne({
    _id: req.params.id,
    pharmacy: pharmacy._id
  });

  if (!prescription) return sendError(res, 404, 'Prescription not found');

  prescription.status = 'approved';
  prescription.reviewedBy = req.userId;
  prescription.reviewedAt = new Date();
  await prescription.save();

  // Notify patient
  await Notification.create({
    user: prescription.patient,
    title: 'Prescription Approved',
    message: `Your prescription has been approved by ${pharmacy.name}. You can now proceed with your order.`,
    type: 'prescription',
    link: `/orders`
  });

  await prescription.populate('patient', 'name email');

  sendSuccess(res, 200, { prescription }, 'Prescription approved successfully');
});

// Reject prescription (pharmacy)
// PATCH /api/prescriptions/:id/reject
export const rejectPrescription = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const pharmacy = await Pharmacy.findOne({ owner: req.userId });
  if (!pharmacy) return sendError(res, 404, 'Pharmacy not found');

  const prescription = await Prescription.findOne({
    _id: req.params.id,
    pharmacy: pharmacy._id
  });

  if (!prescription) return sendError(res, 404, 'Prescription not found');

  prescription.status = 'rejected';
  prescription.rejectionReason = reason || 'Prescription does not meet requirements';
  prescription.reviewedBy = req.userId;
  prescription.reviewedAt = new Date();
  await prescription.save();

  // Notify patient
  await Notification.create({
    user: prescription.patient,
    title: 'Prescription Rejected',
    message: `Your prescription was rejected. Reason: ${prescription.rejectionReason}`,
    type: 'prescription',
    link: `/dashboard`
  });

  sendSuccess(res, 200, { prescription }, 'Prescription rejected');
});

// Delete prescription (patient own, pending only)
// DELETE /api/prescriptions/:id
export const deletePrescription = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findOne({
    _id: req.params.id,
    patient: req.userId,
    status: 'pending'
  });

  if (!prescription) return sendError(res, 404, 'Prescription not found or cannot be deleted');

  // Delete the file if it exists
  const filePath = path.join(process.cwd(), prescription.imageUrl);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await Prescription.findByIdAndDelete(req.params.id);

  sendSuccess(res, 200, null, 'Prescription deleted successfully');
});

// Get all prescriptions (admin)
// GET /api/prescriptions/admin/all
export const getAllPrescriptions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, pharmacyId } = req.query;

  const query = {};
  if (status) query.status = status;
  if (pharmacyId) query.pharmacy = pharmacyId;

  const prescriptions = await Prescription.find(query)
    .populate('patient', 'name email phone')
    .populate('pharmacy', 'name')
    .populate('order', 'orderNumber total')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Prescription.countDocuments(query);

  sendSuccess(res, 200, {
    prescriptions,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    }
  }, 'All prescriptions fetched');
});