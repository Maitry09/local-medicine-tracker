import User from '../models/User.js';
import { generateTokenPair, verifyRefreshToken, generateAccessToken } from '../utils/jwt.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/errorHandler.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import crypto from 'crypto';

// Register a new user
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role, address } = req.body;

  console.log('📝 Register request received:', { name, email, phone, role });

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ User already exists:', email);
      return sendError(res, 400, 'User with this email already exists');
    }

    console.log('✅ No existing user found, proceeding with creation');

    // Create user
    console.log('🔄 Creating user with data:', { name, email, role, hasPhone: !!phone });
    const user = await User.create({
      name,
      email,
      password,
      phone: phone || null,
      role: role || 'patient',
      address
    });

    console.log('✅ User created successfully in database:', {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    // Verify user was saved
    const savedUser = await User.findById(user._id);
    if (!savedUser) {
      console.error('❌ CRITICAL: User was created but cannot be retrieved!');
      return sendError(res, 500, 'Failed to verify user registration');
    }
    console.log('✅ Verified: User exists in database');

    // Generate tokens
    const { accessToken, refreshToken } = generateTokenPair(user._id, user.role);
    console.log('✅ Tokens generated');

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    console.log('✅ Refresh token saved to user');

    sendSuccess(res, 201, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      },
      accessToken,
      refreshToken
    }, 'Registration successful');
  } catch (error) {
    console.error('❌ Register error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    });
    throw error;
  }
});

// Login user
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user and include password
  const user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    return sendError(res, 401, 'Invalid email or password');
  }

  if (!user.isActive) {
    return sendError(res, 401, 'Your account has been deactivated by an administrator');
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return sendError(res, 401, 'Invalid email or password');
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokenPair(user._id, user.role);

  // Save refresh token (skip validation in case phone/other legacy fields don't pass validators)
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  sendSuccess(res, 200, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      pharmacyId: user.pharmacyId
    },
    accessToken,
    refreshToken
  }, 'Login successful');
});

// Refresh access token
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return sendError(res, 400, 'Refresh token is required');
  }

  // Verify refresh token
  const decoded = verifyRefreshToken(token);
  if (!decoded) {
    return sendError(res, 401, 'Invalid or expired refresh token');
  }

  // Find user with matching refresh token
  const user = await User.findById(decoded.userId).select('+refreshToken');
  
  if (!user || user.refreshToken !== token) {
    return sendError(res, 401, 'Invalid refresh token');
  }

  if (!user.isActive) {
    return sendError(res, 401, 'Your account has been deactivated by an administrator');
  }

  // Generate new access token
  const accessToken = generateAccessToken(user._id, user.role);

  sendSuccess(res, 200, { accessToken }, 'Token refreshed successfully');
});

// Forgot password - generate reset token
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return sendError(res, 404, 'User not found');
  }

  const token = crypto.randomBytes(20).toString('hex');
  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await user.save({ validateBeforeSave: false });

  await sendPasswordResetEmail(user, token);
  console.log(`Password reset token for ${email}: ${token}`);

  sendSuccess(res, 200, null, 'Password reset instructions sent to your email');
});

// Reset password using token
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }
  }).select('+password');

  if (!user) {
    return sendError(res, 400, 'Invalid or expired reset token');
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save({ validateBeforeSave: false });

  sendSuccess(res, 200, null, 'Password has been reset successfully');
});

// Logout user
export const logout = asyncHandler(async (req, res) => {
  // Clear refresh token from database
  await User.findByIdAndUpdate(req.userId, { refreshToken: null });

  sendSuccess(res, 200, null, 'Logout successful');
});

// Get current user
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).populate('pharmacyId');

  sendSuccess(res, 200, { user }, 'User fetched successfully');
});

// Update current user profile
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, address } = req.body;

  const user = await User.findByIdAndUpdate(
    req.userId,
    { name, phone, address },
    { new: true, runValidators: true }
  );

  sendSuccess(res, 200, { user }, 'Profile updated successfully');
});

// Change password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.userId).select('+password');

  // Check current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return sendError(res, 400, 'Current password is incorrect');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  sendSuccess(res, 200, null, 'Password changed successfully');
});
