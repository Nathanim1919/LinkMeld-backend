"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectMongo = connectMongo;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("./config");
let isConnected = false;
const defaultOptions = {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4,
};
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function connectMongo() {
    if (isConnected)
        return mongoose_1.default;
    const uri = process.env.MONGO_URI || config_1.config.mongoUri;
    if (!uri)
        throw new Error("MONGO_URI is not set in environment or config");
    mongoose_1.default.set("strictQuery", false);
    const maxRetries = Number(process.env.MONGO_CONNECT_RETRIES || 5);
    const baseDelay = 1000;
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Connecting to MongoDB (attempt ${attempt}/${maxRetries})...`);
            await mongoose_1.default.connect(uri, defaultOptions);
            isConnected = true;
            console.log("Connected to MongoDB");
            return mongoose_1.default;
        }
        catch (err) {
            lastError = err;
            console.error(`MongoDB connection attempt ${attempt} failed:`, err);
            if (attempt < maxRetries) {
                const wait = baseDelay * Math.pow(2, attempt - 1);
                console.log(`Retrying MongoDB connection in ${wait}ms...`);
                await delay(wait);
            }
        }
    }
    throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts. Last error: ${(lastError === null || lastError === void 0 ? void 0 : lastError.message) || lastError}`);
}
//# sourceMappingURL=database.js.map