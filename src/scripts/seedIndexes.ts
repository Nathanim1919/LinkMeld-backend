// scripts/seedIndexes.ts
import mongoose from "mongoose";
import { Capture } from "../models/Capture";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI!;

async function createIndexes() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("📦 Connected to MongoDB");

    const collection = Capture.collection;

    // Step 1: Drop old `slug_1` index if it exists
    try {
      await collection.dropIndex("slug_1");
      console.log("🗑️ Dropped old slug_1 index");
    } catch (err: any) {
      if (err.codeName !== "IndexNotFound") {
        throw err;
      } else {
        console.log("ℹ️ No slug_1 index found (already dropped)");
      }
    }

    // Step 2: Drop old `searchTokens_text` index if it exists
    try {
      await collection.dropIndex("searchTokens_text");
      console.log("🗑️ Dropped old searchTokens_text index");
    } catch (err: any) {
      if (err.codeName !== "IndexNotFound") {
        throw err;
      } else {
        console.log("ℹ️ No searchTokens_text index found (already dropped)");
      }
    }

    // Step 3: Create compound unique index: { slug, owner, format }
    await collection.createIndex(
      { slug: 1, owner: 1, format: 1 },
      { unique: true, name: "unique_slug_per_owner_format" }
    );
    console.log("✅ Created compound unique index: unique_slug_per_owner_format");

    // Step 4: Create full-text index
    await collection.createIndex(
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
    console.log("✅ Created text index: content_search");

    console.log("🎉 All indexes created successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating indexes:", err);
    process.exit(1);
  }
}

createIndexes();
