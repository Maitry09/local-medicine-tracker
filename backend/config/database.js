import mongoose from 'mongoose';

const connectDB = async () => {
  // FIXED: Fail fast if env variable is missing — no silent fallback
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
      console.log('🔄 Connecting to MongoDB:', maskedURI);
    }

    const conn = await mongoose.connect(mongoURI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📂 Database: ${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);

    if (error.message.includes('ECONNREFUSED')) {
      console.error('💡 Make sure MongoDB is running: sudo systemctl start mongod');
    } else if (error.message.includes('Authentication failed')) {
      console.error('💡 Check your MongoDB username and password in .env');
    }

    throw error; // Let server.js handle exit — don't call process.exit() here
  }
};

export default connectDB;