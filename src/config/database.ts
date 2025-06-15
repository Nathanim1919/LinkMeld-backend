import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/LinkMeld';
    // const mongoURI = 'mongodb://localhost:27017/LinkMeld'; // Use a default URI for local development
    await mongoose.connect(mongoURI);
    console.log('📦 MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

export default connectDB; 