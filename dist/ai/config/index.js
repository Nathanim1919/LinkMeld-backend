"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generativeModel = exports.DEFAULT_CONFIG = void 0;
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey)
    throw new Error('Missing GEMINI_API_KEY');
exports.DEFAULT_CONFIG = {
    model: 'gemini-1.5-pro',
    embeddingModel: 'text-embedding-004',
    temperature: 0.3,
    maxTokens: 1000,
    maxRetries: 3,
    project: process.env.GCP_PROJECT,
    location: process.env.GCP_LOCATION,
    credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
};
const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
exports.generativeModel = genAI.getGenerativeModel({
    model: 'gemini-pro',
});
//# sourceMappingURL=index.js.map