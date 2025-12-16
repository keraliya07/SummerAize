const mongoose = require('mongoose');

const connectToDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set. Please check your .env file.');
  }

  try {
    await mongoose.connect(mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
    });
    console.log('Successfully connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    if (error.message.includes('ENOTFOUND')) {
      throw new Error(`MongoDB connection failed: Cannot resolve hostname. Please check your MONGODB_URI. Error: ${error.message}`);
    } else if (error.message.includes('authentication')) {
      throw new Error(`MongoDB authentication failed. Please check your username and password in MONGODB_URI.`);
    } else {
      throw new Error(`MongoDB connection failed: ${error.message}`);
    }
  }
};

module.exports = { connectToDatabase };


