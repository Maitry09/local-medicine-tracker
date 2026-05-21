import logger from '../utils/logger.js';
import { verifyAccessToken } from '../utils/jwt.js';
import User from '../models/User.js';
import Pharmacy from '../models/Pharmacy.js';
import { sendError } from '../utils/errorHandler.js';

// Middleware to verify JWT token
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'Access denied. No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    
    if (!decoded) {
      return sendError(res, 401, 'Invalid or expired token');
    }

    const user = await User.findById(decoded.userId).populate('pharmacyId');
    
    if (!user) {
      return sendError(res, 401, 'User not found');
    }

    if (!user.isActive) {
      return sendError(res, 401, 'Your account has been deactivated by an administrator');
    }

    if (user.role === 'pharmacy' && user.pharmacyId) {
      const pharmacy = await Pharmacy.findById(user.pharmacyId).select('isPermanentClose status');
      // ONLY block permanently closed or admin-disabled pharmacies
      // Rejected pharmacies CAN login to see reason and resubmit
      if (pharmacy && (pharmacy.isPermanentClose === true || pharmacy.status === 'disabled')) {
        return sendError(res, 401, 'Your pharmacy has been permanently disabled. Contact support.');
      }
    }

    req.user = user;
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error.message);
    return sendError(res, 401, 'Authentication failed');
  }
};

// Middleware to check user roles
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required');
    }
    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 403, `Access denied. Required roles: ${allowedRoles.join(', ')}`);
    }
    next();
  };
};

// Granular permission system
const PERMISSIONS = {
  'medicines:search': ['patient', 'pharmacy', 'admin'],
  'medicines:view': ['patient', 'pharmacy', 'admin'],
  'pharmacies:list': ['patient', 'pharmacy', 'admin'],
  'pharmacies:view': ['patient', 'pharmacy', 'admin'],
  'orders:create': ['patient', 'pharmacy', 'admin'],
  'orders:view_own': ['patient', 'pharmacy', 'admin'],
  'alerts:create': ['patient', 'pharmacy', 'admin'],
  'alerts:manage_own': ['patient', 'pharmacy', 'admin'],
  'payments:create': ['patient', 'pharmacy', 'admin'],
  'profile:update_own': ['patient', 'pharmacy', 'admin'],
  'stock:add': ['pharmacy', 'admin'],
  'stock:update': ['pharmacy', 'admin'],
  'stock:delete': ['pharmacy', 'admin'],
  'stock:view_own': ['pharmacy', 'admin'],
  'medicines:add': ['pharmacy', 'admin'],
  'medicines:update_own': ['pharmacy', 'admin'],
  'medicines:delete_own': ['pharmacy', 'admin'],
  'pharmacy:update_own': ['pharmacy', 'admin'],
  'pharmacy:view_own': ['pharmacy', 'admin'],
  'orders:view_pharmacy': ['pharmacy', 'admin'],
  'orders:update_status': ['pharmacy', 'admin'],
  'users:view_all': ['admin'],
  'users:create': ['admin'],
  'users:update_any': ['admin'],
  'users:delete_any': ['admin'],
  'users:disable': ['admin'],
  'users:enable': ['admin'],
  'pharmacies:view_all': ['admin'],
  'pharmacies:create': ['admin'],
  'pharmacies:verify': ['admin'],
  'pharmacies:update_any': ['admin'],
  'pharmacies:delete_any': ['admin'],
  'orders:view_all': ['admin'],
  'orders:cancel_any': ['admin'],
  'payments:view_all': ['admin'],
  'payments:refund': ['admin'],
  'statistics:view': ['admin'],
  'medicines:update_any': ['admin'],
  'medicines:delete_any': ['admin'],
  'alerts:view_all': ['admin'],
};

export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required');
    }
    const allowedRoles = PERMISSIONS[permission];
    if (!allowedRoles) {
      return sendError(res, 500, 'Permission configuration error');
    }
    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 403, `Access denied. Missing permission: ${permission}`);
    }
    next();
  };
};

export const requireOwnership = (Model, paramName = 'id', ownerField = 'userId') => {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'admin') return next();
      const resource = await Model.findById(req.params[paramName]);
      if (!resource) return sendError(res, 404, 'Resource not found');
      if (resource[ownerField]?.toString() !== req.userId.toString()) {
        return sendError(res, 403, 'Access denied. You do not own this resource');
      }
      req.resource = resource;
      next();
    } catch (error) {
      return sendError(res, 500, 'Error checking resource ownership');
    }
  };
};

export const requirePharmacyOwnership = (Model, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'admin') return next();
      if (req.user.role !== 'pharmacy') {
        return sendError(res, 403, 'Access denied. Pharmacy role required');
      }
      const resource = await Model.findById(req.params[paramName]);
      if (!resource) return sendError(res, 404, 'Resource not found');
      const pharmacyId = req.user.pharmacyId?.toString();
      if (!pharmacyId) return sendError(res, 403, 'No pharmacy associated with this account');
      if (pharmacyId !== resource.pharmacyId?.toString()) {
        return sendError(res, 403, 'Access denied. This resource belongs to another pharmacy');
      }
      req.resource = resource;
      next();
    } catch (error) {
      return sendError(res, 500, 'Error checking pharmacy ownership');
    }
  };
};

// Optional auth — never blocks, silently attaches user if valid token
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);
      if (decoded) {
        const user = await User.findById(decoded.userId);
        if (user && user.isActive) {
          if (user.role === 'pharmacy' && user.pharmacyId) {
            const pharmacy = await Pharmacy.findById(user.pharmacyId).select('isPermanentClose status');
            // Only skip attaching if permanently disabled — rejected still gets attached
            if (pharmacy && (pharmacy.isPermanentClose === true || pharmacy.status === 'disabled')) {
              return next();
            }
          }
          req.user = user;
          req.userId = decoded.userId;
          req.userRole = decoded.role;
        }
      }
    }
  } catch (error) {
    // Silent fail for optional auth
  }
  next();
};

export const getAllPermissions = () => PERMISSIONS;