// src/config/mongoClient.ts
import { MongoClient } from "mongodb";

// const uri = "mongodb://localhost:27017/LinkMeld";
export const client = new MongoClient("mongodb://localhost:27017/LinkMeld");

(async () => {
  try {
    await client.connect();
    console.log("📦 MongoDB connected via native driver");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
})();
