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
import { url } from 'inspector';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
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
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

logger.info('🚀 Starting Medicine Tracker Backend...');
logger.info('📍 Environment:', process.env.NODE_ENV || 'development');


// Initialize express app
const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow frontend to fetch resources
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    }
  }
}));


app.use(express.static(path.join(__dirname, "../client/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost on common development ports
    if (origin.match(/^http:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }
    
    // Allow specific frontend URL if set
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175'
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Capture raw body for request signing and keep normal JSON parsing elsewhere
const jsonParser = express.json({
  verify: (req, res, buf) => {
    if (buf && buf.length) req.rawBody = buf;
  }
});

app.use((req, res, next) => {
  // Let payment webhook keep its express.raw parser defined on the route
  if (req.originalUrl === '/api/payments/webhook') return next();
  return jsonParser(req, res, next);
});

app.use(express.urlencoded({ extended: true }));

// Cookie parser is required for cookie-based CSRF protection
app.use(cookieParser());

app.use(mongoSanitize({
  replaceWith: '_',  // Replace $ and . with _ instead of removing (easier to debug)
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

// Enforce HTTPS in production when behind a proxy (Heroku, nginx, etc.)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    if (proto && proto.toLowerCase() !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    }
    next();
  });
}

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minute window
  max: 200,                   // max 200 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.'
  },
  skip: (req) => process.env.NODE_ENV === 'test'
});
app.use(generalLimiter);

// CSRF protection (cookie-based). Exempt webhook and signed requests.
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  },
  value: (req) => req.headers['x-csrf-token'] || req.body?.csrfToken
});

// Provide a token endpoint clients can call to fetch the CSRF token
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Apply CSRF protection to state-changing routes, but skip webhooks and signed requests
app.use((req, res, next) => {
  const referer = req.get('referer') || '';
  const isSwaggerRequest = process.env.NODE_ENV === 'development' && referer.includes('/api-docs');
  const isExempt = req.originalUrl.startsWith('/api/payments/webhook') || !!req.headers['x-signature'] || isSwaggerRequest;

  if (isExempt) return next();
  return csrfProtection(req, res, next);
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Medicine Tracker API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Database connection test endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    const dbStatus = {
      0: 'Disconnected',
      1: 'Connected',
      2: 'Connecting',
      3: 'Disconnecting'
    };

    // Try to perform a simple operation
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
      collections: collections,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message,
      database: {
        status: 'Error',
        readyState: mongoose.connection.readyState
      }
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

const __filename = fileURLToPath(import.meta.url);
const swaggerDocument = JSON.parse(readFileSync(join(__dirname, 'docs/openapi.json'), 'utf-8'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: '🏥 Medicine Tracker API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      testDB: '/api/test-db',
      auth: '/api/auth',
      users: '/api/users',
      medicines: '/api/medicines',
      pharmacies: '/api/pharmacies',
      stock: '/api/stock',
      alerts: '/api/alerts',
      orders: '/api/orders',
      payments: '/api/payments',
      admin: '/api/admin'
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('❌ Error:', err.message);
  logger.error('Stack:', err.stack);
  
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err 
    })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`
  });
});

// Start server with proper async/await
const startServer = async () => {
  try {
    // Connect to MongoDB before starting the server
    await connectDB();
    
    const PORT = process.env.PORT || 5002;

    const server = app.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`);
      logger.info(`📡 API endpoint: http://localhost:${PORT}/api`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/api/health`);
      logger.info(`🔍 DB test: http://localhost:${PORT}/api/test-db`);
    });

    // Graceful shutdown - SIGTERM
    process.on('SIGTERM', () => {
      logger.info('🛑 SIGTERM received, shutting down gracefully...');
      server.close(() => {
        logger.info('✅ Server closed');
        mongoose.connection.close(false, () => {
          logger.info('✅ MongoDB connection closed');
          process.exit(0);
        });
      });
    });

    // Graceful shutdown - SIGINT
    process.on('SIGINT', () => {
      logger.info('\n🛑 SIGINT received, shutting down gracefully...');
      server.close(() => {
        logger.info('✅ Server closed');
        mongoose.connection.close(false, () => {
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

// Start the server
startServer();

export default app;