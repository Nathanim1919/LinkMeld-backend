"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Capture_1 = require("../common/models/Capture");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const MONGO_URI = process.env.MONGO_URI;
async function createIndexes() {
    try {
        await mongoose_1.default.connect(MONGO_URI);
        console.log("📦 Connected to MongoDB");
        const collection = Capture_1.Capture.collection;
        try {
            await collection.dropIndex("slug_1");
            console.log("🗑️ Dropped old slug_1 index");
        }
        catch (err) {
            if (err.codeName !== "IndexNotFound") {
                throw err;
            }
            else {
                console.log("ℹ️ slug_1 index not found (already dropped)");
            }
        }
        try {
            await collection.dropIndex("searchTokens_text");
            console.log("🗑️ Dropped old searchTokens_text index");
        }
        catch (err) {
            if (err.codeName !== "IndexNotFound") {
                throw err;
            }
            else {
                console.log("ℹ️ searchTokens_text index not found (already dropped)");
            }
        }
        try {
            await collection.dropIndex("unique_slug_per_owner_format");
            console.log("🗑️ Dropped old unique_slug_per_owner_format index");
        }
        catch (err) {
            if (err.codeName !== "IndexNotFound") {
                throw err;
            }
            else {
                console.log("ℹ️ unique_slug_per_owner_format index not found (already dropped)");
            }
        }
        await collection.createIndex({ owner: 1, contentHash: 1, format: 1 }, {
            unique: true,
            sparse: true,
            name: "unique_content_per_owner_format",
        });
        console.log("✅ Created unique index: unique_content_per_owner_format");
        try {
            await collection.dropIndex("slug_1");
            console.log("🗑️ Dropped old slug_1 index");
        }
        catch (err) {
            if (err.codeName !== "IndexNotFound") {
                console.log("⚠️ Could not drop slug_1, might not exist or already renamed");
            }
        }
        try {
            await collection.createIndex({ slug: 1 }, { name: "slug_index" });
            console.log("🔎 Created non-unique slug index");
        }
        catch (err) {
            if (err.code === 85) {
                console.log("ℹ️ Slug index already exists with same key pattern");
            }
            else {
                throw err;
            }
        }
        await collection.createIndex({
            title: "text",
            "content.clean": "text",
        }, {
            name: "content_search",
            weights: {
                title: 10,
                "content.clean": 3,
            },
        });
        console.log("🔤 Created full-text index: content_search");
        console.log("🎉 All indexes created successfully!");
        process.exit(0);
    }
    catch (err) {
        console.error("❌ Error creating indexes:", err);
        process.exit(1);
    }
}
createIndexes();
//# sourceMappingURL=seedIndexes.js.map