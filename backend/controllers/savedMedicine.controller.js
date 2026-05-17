import SavedMedicine from '../models/SavedMedicine.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/errorHandler.js';

// Add a saved medicine for current user
export const addSavedMedicine = asyncHandler(async (req, res) => {
  const { medicineId, pharmacyId, note } = req.body;

  const existing = await SavedMedicine.findOne({ user: req.userId, medicine: medicineId });
  if (existing) {
    // update note/pharmacy
    existing.note = note || existing.note;
    existing.pharmacy = pharmacyId || existing.pharmacy;
    await existing.save();
    return sendSuccess(res, 200, { saved: existing }, 'Saved medicine updated');
  }

  const saved = await SavedMedicine.create({ user: req.userId, medicine: medicineId, pharmacy: pharmacyId, note });
  sendSuccess(res, 201, { saved }, 'Medicine saved');
});

export const getMySaved = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const saved = await SavedMedicine.find({ user: req.userId })
    .populate('medicine')
    .populate('pharmacy')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await SavedMedicine.countDocuments({ user: req.userId });

  sendSuccess(res, 200, { saved, pagination: { current: parseInt(page), pages: Math.ceil(total / limit), total } }, 'Saved medicines fetched');
});

export const deleteSaved = asyncHandler(async (req, res) => {
  await SavedMedicine.findOneAndDelete({ _id: req.params.id, user: req.userId });
  sendSuccess(res, 200, null, 'Saved medicine removed');
});

export default {};
