import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Set mongoose configuration
    mongoose.set('strictQuery', false);
    
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medicine_tracker';
    
    console.log('🔄 Attempting to connect to MongoDB...');
    console.log('📍 Connection URI:', mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')); // Hide password in logs
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB Connected Successfully!');
    console.log(`📊 Database Host: ${conn.connection.host}`);
    console.log(`📂 Database Name: ${conn.connection.name}`);
    console.log(`🔗 Connection State: ${conn.connection.readyState === 1 ? 'Connected' : 'Connecting'}`);
    
    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🛑 MongoDB connection closed due to app termination');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ MongoDB Connection Error:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    
    // Provide helpful error messages
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Tip: Make sure MongoDB is running on your system');
      console.error('   - For local MongoDB: sudo systemctl start mongod');
      console.error('   - Or use MongoDB Atlas cloud database');
    } else if (error.message.includes('Authentication failed')) {
      console.error('\n💡 Tip: Check your MongoDB username and password in .env');
    } else if (error.message.includes('getaddrinfo ENOTFOUND')) {
      console.error('\n💡 Tip: Check your MongoDB connection string in .env');
    }
    
    console.error('\nFull error details:', error);
    process.exit(1);
  }
};

export default connectDB;