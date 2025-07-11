// scripts/seedIndexes.ts
import mongoose from "mongoose";
import { Capture } from "../models/Capture";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI!;




async function createIndexes() {
  await mongoose.connect(MONGO_URI);

  await Capture.collection.dropIndex("searchTokens_text").catch(err => {
    if (err.codeName !== "IndexNotFound") {
      throw err;
    }
  });
  

  await Capture.collection.createIndex(
    {
      title: "text",
      "content.clean": "text",
    },
    {
      name: "content_search",
      weights: {
        title: 10,
        "content.clean": 3,
      },
    }
  );

  console.log("✅ Text index created!");
  process.exit(0);
}

createIndexes().catch((err) => {
  console.error("Error creating indexes:", err);
  process.exit(1);
});
