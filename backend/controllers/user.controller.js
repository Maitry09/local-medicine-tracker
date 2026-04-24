import User from '../models/User.js';
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
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!user) {
    return sendError(res, 404, 'User not found');
  }

  sendSuccess(res, 200, { user }, 'User disabled successfully');
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

  sendSuccess(res, 200, { user }, 'User enabled successfully');
});

// Delete user (admin only)
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return sendError(res, 404, 'User not found');
  }

  // Prevent deleting admin users
  if (user.role === 'admin') {
    return sendError(res, 400, 'Cannot delete admin users');
  }

  await User.findByIdAndDelete(req.params.id);

  sendSuccess(res, 200, null, 'User deleted successfully');
});
