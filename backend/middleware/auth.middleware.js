import logger from '../utils/logger.js';
import { verifyAccessToken } from '../utils/jwt.js';
import User from '../models/User.js';
import Pharmacy from '../models/Pharmacy.js';
import { sendError } from '../utils/errorHandler.js';

// Middleware to verify JWT token
export const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.debug('No authorization header or invalid format');
      return sendError(res, 401, 'Access denied. No token provided');
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = verifyAccessToken(token);
    
    if (!decoded) {
      logger.debug('Token verification failed');
      return sendError(res, 401, 'Invalid or expired token');
    }

    // Get user from database
    const user = await User.findById(decoded.userId).populate('pharmacyId');
    
    if (!user) {
      logger.debug('User not found for token');
      return sendError(res, 401, 'User not found');
    }

    if (!user.isActive) {
      logger.debug('User account is deactivated');
      return sendError(res, 401, 'Your account has been deactivated by an administrator');
    }

    if (user.role === 'pharmacy' && user.pharmacyId) {
      const pharmacy = await Pharmacy.findById(user.pharmacyId).select('isPermanentClose status isActive');
      if (pharmacy && (pharmacy.isPermanentClose || pharmacy.status === 'disabled' || !pharmacy.isActive)) {
        logger.debug('Pharmacy account permanently closed or disabled');
        return sendError(res, 401, 'Your pharmacy account has been disabled. Contact support for assistance.');
      }
    }

    // Attach user to request
    req.user = user;
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    
    logger.info(' User authenticated:', { userId: decoded.userId, role: decoded.role });
    
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
      logger.debug(` Role check failed. User role: ${req.user.role}, Required: ${allowedRoles.join(', ')}`);
      return sendError(res, 403, `Access denied. Required roles: ${allowedRoles.join(', ')}`);
    }

    logger.debug(` Role check passed for ${req.user.role}`);
    next();
  };
};

// Granular permission system
const PERMISSIONS = {
  // Patient permissions
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
  
  // Pharmacy permissions
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
  
  // Admin permissions
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

// Middleware to check specific permissions
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required');
    }

    const allowedRoles = PERMISSIONS[permission];
    
    if (!allowedRoles) {
      logger.error(` Permission '${permission}' not defined in PERMISSIONS object`);
      return sendError(res, 500, 'Permission configuration error');
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.debug(` Permission denied. User role: ${req.user.role}, Required permission: ${permission}`);
      return sendError(res, 403, `Access denied. Missing permission: ${permission}`);
    }

    logger.info(`✅ Permission check passed: ${permission} for ${req.user.role}`);
    next();
  };
};

// Check if user owns the resource (for user-specific resources)
export const requireOwnership = (Model, paramName = 'id', ownerField = 'userId') => {
  return async (req, res, next) => {
    try {
      // Admins bypass ownership check
      if (req.user.role === 'admin') {
        logger.info(' Admin user - ownership check bypassed');
        return next();
      }

      const resourceId = req.params[paramName];
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return sendError(res, 404, 'Resource not found');
      }

      // Check ownership
      const ownerId = resource[ownerField]?.toString();
      const userId = req.userId.toString();

      if (ownerId !== userId) {
        logger.debug(` Ownership check failed. Resource owner: ${ownerId}, User: ${userId}`);
        return sendError(res, 403, 'Access denied. You do not own this resource');
      }

      logger.info(' Ownership verified');
      req.resource = resource;
      next();
    } catch (error) {
      logger.error('Ownership check error:', error.message);
      return sendError(res, 500, 'Error checking resource ownership');
    }
  };
};

// Check if pharmacy owns the resource
export const requirePharmacyOwnership = (Model, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      // Admins bypass ownership check
      if (req.user.role === 'admin') {
        logger.info(' Admin user - pharmacy ownership check bypassed');
        return next();
      }

      // Only pharmacies can proceed
      if (req.user.role !== 'pharmacy') {
        return sendError(res, 403, 'Access denied. Pharmacy role required');
      }

      const resourceId = req.params[paramName];
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return sendError(res, 404, 'Resource not found');
      }

      // Check if pharmacy owns this resource
      const pharmacyId = req.user.pharmacyId?.toString();
      const resourcePharmacyId = resource.pharmacyId?.toString();

      if (!pharmacyId) {
        return sendError(res, 403, 'Access denied. No pharmacy associated with this account');
      }

      if (pharmacyId !== resourcePharmacyId) {
        logger.debug(` Pharmacy ownership check failed. Resource pharmacy: ${resourcePharmacyId}, User pharmacy: ${pharmacyId}`);
        return sendError(res, 403, 'Access denied. This resource belongs to another pharmacy');
      }

      logger.info(' Pharmacy ownership verified');
      req.resource = resource;
      next();
    } catch (error) {
      logger.error('Pharmacy ownership check error:', error.message);
      return sendError(res, 500, 'Error checking pharmacy ownership');
    }
  };
};

// Optional auth middleware (doesn't fail if no token)
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
            const pharmacy = await Pharmacy.findById(user.pharmacyId).select('isPermanentClose status isActive');
            if (pharmacy && (pharmacy.isPermanentClose || pharmacy.status === 'disabled' || !pharmacy.isActive)) {
              return next();
            }
          }

          req.user = user;
          req.userId = decoded.userId;
          req.userRole = decoded.role;
          logger.info(' Optional auth - user identified:', decoded.userId);
        }
      }
    }
  } catch (error) {
    // Silent fail for optional auth
  }
  next();
};

// Export all permissions for documentation/testing
export const getAllPermissions = () => PERMISSIONS;