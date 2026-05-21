import User from '../models/User.js';
import Pharmacy from '../models/Pharmacy.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/errorHandler.js';

// Get all users (admin only)
export const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, role, search, isActive } = req.query;
  
  const query = {};
  
  if (role) {
    query.role = role;
  }
  
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User.find(query)
    .select('-refreshToken')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await User.countDocuments(query);

  sendSuccess(res, 200, {
    users,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    }
  }, 'Users fetched successfully');
});

// Get user by ID (admin only)
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate('pharmacyId');

  if (!user) {
    return sendError(res, 404, 'User not found');
  }

  sendSuccess(res, 200, { user }, 'User fetched successfully');
});

// Update user (admin only)
export const updateUser = asyncHandler(async (req, res) => {
  const { name, phone, role, isActive, isVerified } = req.body;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { name, phone, role, isActive, isVerified },
    { new: true, runValidators: true }
  );

  if (!user) {
    return sendError(res, 404, 'User not found');
  }

  sendSuccess(res, 200, { user }, 'User updated successfully');
});

// Disable user (admin only)
export const disableUser = asyncHandler(async (req, res) => {
  const userToDisable = await User.findById(req.params.id);
  if (!userToDisable) return sendError(res, 404, 'User not found');

  if (userToDisable.role === 'admin') {
    return sendError(res, 400, 'Cannot deactivate admin users');
  }

  userToDisable.isActive = false;
  await userToDisable.save();

  sendSuccess(res, 200, { user: userToDisable }, 'User disabled successfully');
});

// Enable user (admin only)
export const enableUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: true },
    { new: true }
  );

  if (!user) {
    return sendError(res, 404, 'User not found');
  }

  // If this is a pharmacy owner, also reactivate the pharmacy if it was permanently disabled
  if (user.role === 'pharmacy' && user.pharmacyId) {
    const pharmacy = await Pharmacy.findById(user.pharmacyId);
    if (pharmacy && pharmacy.status === 'disabled') {
      await Pharmacy.findByIdAndUpdate(user.pharmacyId, {
        isActive: true,
        isPermanentClose: false,
        status: 'approved'
      });
    }
    // Note: rejected pharmacies are NOT touched here — their status stays rejected
    // so admin must separately approve them after the owner resubmits
  }

  sendSuccess(res, 200, { user }, 'User enabled successfully');
});

// Delete user (admin only)
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return sendError(res, 404, 'User not found');
  }

  if (user._id.toString() === req.userId.toString()) {
    return sendError(res, 400, 'You cannot delete your own account');
  }

  await User.findByIdAndDelete(req.params.id);

  sendSuccess(res, 200, null, 'User deleted successfully');
});