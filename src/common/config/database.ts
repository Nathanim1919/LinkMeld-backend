import mongoose, { ConnectOptions } from "mongoose";
import { config } from "./config";

let isConnected = false;

const defaultOptions: ConnectOptions = {
  // Some options may be deprecated depending on your mongoose version;
  // these are included to improve reliability across environments.
  // @ts-ignore
  useNewUrlParser: true,
  // @ts-ignore
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // 10s to fail fast on DNS / server issues
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4, // prefer IPv4, can help avoid some DNS resolution issues
} as unknown as ConnectOptions;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connectMongo(): Promise<typeof mongoose> {
  if (isConnected) return mongoose;
  const uri = process.env.MONGO_URI || config.mongoUri;
  if (!uri) throw new Error("MONGO_URI is not set in environment or config");

  // Reduce noisy warnings in some mongoose versions
  try {
    mongoose.set("strictQuery", false);
  } catch {}

  const maxRetries = Number(process.env.MONGO_CONNECT_RETRIES || 5);
  const baseDelay = 1000; // ms

  let lastError: any = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `Connecting to MongoDB (attempt ${attempt}/${maxRetries})...`,
      );
      await mongoose.connect(uri, defaultOptions);
      isConnected = true;
      console.log("Connected to MongoDB");
      return mongoose;
    } catch (err) {
      lastError = err;
      console.error(`MongoDB connection attempt ${attempt} failed:`, err);
      if (attempt < maxRetries) {
        const wait = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Retrying MongoDB connection in ${wait}ms...`);
        await delay(wait);
      }
    }
  }

  // After exhausting retries, throw a clear error
  throw new Error(
    `Failed to connect to MongoDB after ${maxRetries} attempts. Last error: ${lastError?.message || lastError}`,
  );
}
