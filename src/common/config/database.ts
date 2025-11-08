import mongoose from 'mongoose';
import { config } from './config';

let isConnected = false;

export async function connectMongo(): Promise<typeof mongoose> {
  if (isConnected) return mongoose;
  const uri = process.env.MONGO_URI || config.mongoUri;
  if (!uri) throw new Error('MONGO_URI is not set in environment or config');
  await mongoose.connect(uri, {
    // Add any mongoose options here if needed
  });
  isConnected = true;
  return mongoose;
}







