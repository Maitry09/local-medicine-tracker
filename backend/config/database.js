import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    throw new Error(
      'MONGODB_URI is not set. Create a backend/.env file from backend/.env.example'
    );
  }

  try {
    mongoose.set('strictQuery', false);

    // Only log the URI in development, and mask credentials
    if (process.env.NODE_ENV === 'development') {
      const maskedURI = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
      logger.info('🔄 Connecting to MongoDB:', maskedURI);
    }

    const conn = await mongoose.connect(mongoURI);

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    logger.info(`📂 Database: ${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      logger.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('✅ MongoDB reconnected');
    });

  } catch (error) {
    logger.error('❌ MongoDB Connection Failed:', error.message);

    if (error.message.includes('ECONNREFUSED')) {
      logger.error('💡 Make sure MongoDB is running: sudo systemctl start mongod');
    } else if (error.message.includes('Authentication failed')) {
      logger.error('💡 Check your MongoDB username and password in .env');
    }

    throw error; // Let server.js handle exit — don't call process.exit() here
  }
};

export default connectDB;