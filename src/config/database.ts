import dotenv from "dotenv";
dotenv.config();


import mongoose from "mongoose";

export const connectMongo = async () => {

  const mongoURI = process.env.MONGO_URI! as string;
  // const mongoURI = "mongodb://localhost:27017/LinkMeld"
  
  if (!mongoURI) {
    throw new Error("MONGO_URI is not defined in .env file");
  }
  try {
    await mongoose.connect(mongoURI);
  } catch (error) {
    process.exit(1);
  }
};