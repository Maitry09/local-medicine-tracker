import logger from './utils/logger.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import connectDB from './config/database.js';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';

// Route imports
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import medicineRoutes from './routes/medicine.routes.js';
import pharmacyRoutes from './routes/pharmacy.routes.js';
import stockRoutes from './routes/stock.routes.js';
import alertRoutes from './routes/alert.routes.js';
import orderRoutes from './routes/order.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import adminRoutes from './routes/admin.routes.js';
import prescriptionRoutes from './routes/prescription.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import savedMedicineRoutes from './routes/savedMedicine.routes.js';
import reviewRoutes from './routes/review.routes.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

logger.info('🚀 Starting Medicine Tracker Backend...');
logger.info('📍 Environment:', process.env.NODE_ENV || 'development');

// Initialize express app
const app = express();

app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));

// CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (origin.match(/^http:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }

    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175'
    ].filter(Boolean);

    if (allowedOrigins.map(o => o.trim()).includes(origin.trim())) {
      return callback(null, true);
    }

    console.log('❌ CORS blocked origin:', origin);
    console.log('✅ Allowed origins:', allowedOrigins);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// JSON body parser
const jsonParser = express.json({
  verify: (req, res, buf) => {
    if (buf && buf.length) req.rawBody = buf;
  }
});

app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') return next();
  return jsonParser(req, res, next);
});

app.use(express.urlencoded({ extended: true }));

app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    if (process.env.NODE_ENV === 'development') {
      logger.warn(`⚠️  Sanitized field "${key}" in ${req.path}`);
    }
  }
}));

app.use((req, res, next) => {
  logger.http(req.method, req.path);
  next();
});

// Rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.'
  },
  skip: (req) => process.env.NODE_ENV === 'test'
});
app.use(generalLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Medicine Tracker API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// DB test
app.get('/api/test-db', async (req, res) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    const dbStatus = { 0: 'Disconnected', 1: 'Connected', 2: 'Connecting', 3: 'Disconnecting' };
    let collections = [];
    if (isConnected) {
      const db = mongoose.connection.db;
      const colls = await db.listCollections().toArray();
      collections = colls.map(c => c.name);
    }
    res.json({
      success: true,
      database: {
        status: dbStatus[mongoose.connection.readyState],
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host || 'N/A',
        name: mongoose.connection.name || 'N/A',
        connected: isConnected
      },
      collections,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      database: { status: 'Error', readyState: mongoose.connection.readyState }
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/pharmacies', pharmacyRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/saved-medicines', savedMedicineRoutes);
app.use('/api/reviews', reviewRoutes);

// Swagger docs
const swaggerDocument = JSON.parse(readFileSync(join(__dirname, 'docs/openapi.json'), 'utf-8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Welcome route
app.get('/', (req, res) => {
  res.json({ message: '🏥 Medicine Tracker API', version: '1.0.0' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('❌ Error:', err.message);
  logger.error('Stack:', err.stack);
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack, error: err })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 5002;
    const server = app.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`);
      logger.info(`📡 API endpoint: http://localhost:${PORT}/api`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/api/health`);
      logger.info(`🔍 DB test: http://localhost:${PORT}/api/test-db`);
    });

    process.on('SIGTERM', () => {
      logger.info('🛑 SIGTERM received, shutting down gracefully...');
      server.close(() => {
        logger.info('✅ Server closed');
        mongoose.connection.close().then(() => {
          logger.info('✅ MongoDB connection closed');
          process.exit(0);
        });
      });
    });

    process.on('SIGINT', () => {
      logger.info('\n🛑 SIGINT received, shutting down gracefully...');
      server.close(() => {
        logger.info('✅ Server closed');
        mongoose.connection.close().then(() => {
          logger.info('✅ MongoDB connection closed');
          process.exit(0);
        });
      });
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

export default app;