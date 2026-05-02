import { body, param, query, validationResult } from 'express-validator';
import { sendError } from '../utils/errorHandler.js';

// Middleware to check validation results
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    console.log('❌ Validation failed:', {
      path: req.path,
      method: req.method,
      errors: errorMessages,
      body: req.body
    });
    return sendError(res, 400, errorMessages.join(', '));
  }
  console.log('✅ Validation passed:', { path: req.path, method: req.method });
  next();
};

// Auth validation rules
export const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit phone number'),
  body('role')
    .optional()
    .isIn(['patient', 'pharmacy']).withMessage('Invalid role')
];

export const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email'),
  body('password')
    .notEmpty().withMessage('Password is required')
];

// Medicine validation rules
export const medicineValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Medicine name is required'),
  body('manufacturer')
    .trim()
    .notEmpty().withMessage('Manufacturer is required'),
  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['Antibiotics', 'Painkillers', 'Antacids', 'Vitamins', 'Diabetes', 'Blood Pressure', 'Heart', 'Skin', 'Eye Care', 'Respiratory', 'Digestive', 'Mental Health', 'Hormones', 'Allergies', 'Other'])
    .withMessage('Invalid category'),
  body('mrp')
    .notEmpty().withMessage('MRP is required')
    .isFloat({ min: 0 }).withMessage('MRP must be a positive number')
];

// Stock validation rules
export const stockValidation = [
  body('medicineId')
    .notEmpty().withMessage('Medicine ID is required')
    .isMongoId().withMessage('Invalid medicine ID'),
  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('expiryDate')
    .notEmpty().withMessage('Expiry date is required')
    .isISO8601().withMessage('Invalid date format')
];

// Order validation rules
export const orderValidation = [
  body('pharmacyId')
    .notEmpty().withMessage('Pharmacy ID is required')
    .isMongoId().withMessage('Invalid pharmacy ID'),
  body('items')
    .isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.medicineId')
    .notEmpty().withMessage('Medicine ID is required')
    .isMongoId().withMessage('Invalid medicine ID'),
  body('items.*.quantity')
    .notEmpty().withMessage('Quantity is required')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('deliveryType')
    .notEmpty().withMessage('Delivery type is required')
    .isIn(['pickup', 'delivery']).withMessage('Invalid delivery type')
];

// Pharmacy validation rules
export const pharmacyValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Pharmacy name is required'),
  body('licenseNumber')
    .trim()
    .notEmpty().withMessage('License number is required'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required'),
  body('address.street')
    .trim()
    .notEmpty().withMessage('Street address is required'),
  body('address.city')
    .trim()
    .notEmpty().withMessage('City is required'),
  body('address.state')
    .trim()
    .notEmpty().withMessage('State is required'),
  body('address.pincode')
    .trim()
    .notEmpty().withMessage('Pincode is required'),
  body('address.coordinates.lat')
    .notEmpty().withMessage('Latitude is required')
    .isFloat().withMessage('Invalid latitude'),
  body('address.coordinates.lng')
    .notEmpty().withMessage('Longitude is required')
    .isFloat().withMessage('Invalid longitude')
];

// Alert validation rules
export const alertValidation = [
  body('medicineId')
    .notEmpty().withMessage('Medicine ID is required')
    .isMongoId().withMessage('Invalid medicine ID'),
  body('type')
    .optional()
    .isIn(['availability', 'price_drop', 'expiry_reminder']).withMessage('Invalid alert type'),
  body('targetPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Target price must be a positive number')
];

// MongoDB ID validation
export const mongoIdValidation = (paramName = 'id') => [
  param(paramName)
    .isMongoId().withMessage('Invalid ID format')
];

// Search query validation
export const searchValidation = [
  query('q')
    .optional()
    .trim(),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];
