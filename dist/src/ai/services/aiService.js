"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildConversationPrompt = exports.validateRequest = exports.conversationRateLimiter = exports.generateSummary = exports.processContent = void 0;
exports.processConversationStream = processConversationStream;
const express_rate_limit_1 = require("express-rate-limit");
const user_service_1 = require("../../api/services/user.service");
const withRetry_1 = require("../../common/utils/withRetry");
const vectorStore_1 = require("./vectorStore");
const logger_1 = require("../../common/utils/logger");
const generative_ai_1 = require("@google/generative-ai");
const summaryPrompts_1 = require("../prompts/summaryPrompts");
const GEMINI_GENERATION_CONFIG = {
    temperature: 0.7,
    topP: 0.9,
    maxOutputTokens: 1000,
};
const DEFAULT_MODEL = "gemini-2.0-flash";
const MAX_CONVERSATION_LENGTH = 30;
const MAX_INPUT_LENGTH = 10000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 100;
const GEMINI_CONFIG = {
    SUMMARY_MODEL: "gemini-pro",
    EMBEDDING_MODEL: "embedding-001",
    MAX_RETRIES: 2,
    REQUEST_TIMEOUT: 30000,
    FREE_TIER_LIMIT: 60,
};
const processContent = async (content, userId, existingSummary) => {
    try {
        const apiKey = await user_service_1.UserService.getGeminiApiKey(userId);
        if (!apiKey) {
            return {
                success: false,
                error: "API key is required for AI operations",
            };
        }
        if (!content || content.trim().length < 100) {
            return {
                success: false,
                error: "Content must be at least 100 characters long.",
            };
        }
        const cleanText = removeBoilerplate(content);
        const summaryResult = await (0, exports.generateSummary)(cleanText, existingSummary, apiKey);
        return {
            success: true,
            data: {
                summary: summaryResult,
            },
        };
    }
    catch (error) {
        return handleGeminiError(error);
    }
};
exports.processContent = processContent;
const generateSummary = async (text, existingSummary = "", apiKey) => {
    var _a, _b, _c, _d, _e;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEMINI_CONFIG.REQUEST_TIMEOUT);
    try {
        const response = await (0, withRetry_1.withRetry)(() => fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: summaryPrompts_1.Prompt.generateSummary(text, existingSummary),
                            },
                        ],
                    },
                ],
            }),
            signal: controller.signal,
        }), GEMINI_CONFIG.MAX_RETRIES, 2000);
        clearTimeout(timeout);
        if (!response.ok) {
            const raw = await response.text();
            console.error("Gemini summary API error:", response.status, raw);
            throw new Error(`Summary API Error ${response.status}: ${raw}`);
        }
        try {
            const data = (await response.json());
            const summaryText = (_e = (_d = (_c = (_b = (_a = data === null || data === void 0 ? void 0 : data.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
            if (!summaryText) {
                console.warn("No summary text found in Gemini response:", data);
                return "";
            }
            return summaryText;
        }
        catch (jsonError) {
            const raw = await response.text();
            console.error("Failed to parse JSON for summary:", jsonError, "Raw:", raw);
            throw new Error(`Invalid JSON response from Gemini summary API: ${raw}`);
        }
    }
    catch (err) {
        clearTimeout(timeout);
        throw err;
    }
};
exports.generateSummary = generateSummary;
const removeBoilerplate = (html) => {
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
};
const handleGeminiError = (error) => {
    console.error("AI Processing Error:", error);
    if (error.name === "AbortError") {
        return {
            success: false,
            error: "Request timed out",
        };
    }
    if (error.message &&
        error.message.includes("404") &&
        error.message.includes("models/gemini-pro is not found")) {
        return {
            success: false,
            error: "Gemini Pro model not found or accessible. Please verify your API key, project configuration, and model availability via ListModels API.",
        };
    }
    if (error.message && error.message.includes("429")) {
        return {
            success: false,
            error: "API rate limit exceeded",
            retryAfter: 60000,
        };
    }
    return {
        success: false,
        error: `AI processing failed: ${error.message || "Unknown error"}.`,
    };
};
exports.conversationRateLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests, please try again later.",
});
const validateRequest = (req) => {
    if (!req.body)
        return { isValid: false, error: "Request body is missing" };
    const { captureId, messages } = req.body;
    if (!captureId) {
        return { isValid: false, error: "Invalid or missing captureId" };
    }
    if (!Array.isArray(messages) || messages.length === 0) {
        return { isValid: false, error: "Messages must be a non-empty array" };
    }
    if (messages.length > MAX_CONVERSATION_LENGTH) {
        return {
            isValid: false,
            error: `Conversation too long. Max ${MAX_CONVERSATION_LENGTH} messages allowed.`,
        };
    }
    for (const msg of messages) {
        if (!msg.role || !["user", "assistant", "system"].includes(msg.role)) {
            return { isValid: false, error: "Invalid message role" };
        }
        if (!msg.content ||
            typeof msg.content !== "string" ||
            msg.content.length > MAX_INPUT_LENGTH) {
            return { isValid: false, error: "Invalid message content" };
        }
    }
    return { isValid: true };
};
exports.validateRequest = validateRequest;
const buildConversationPrompt = (userName, documentSummary, messages, retrievedContext) => {
    return summaryPrompts_1.Prompt.conversationPrompt(userName, documentSummary, messages, retrievedContext);
};
exports.buildConversationPrompt = buildConversationPrompt;
async function* processConversationStream(user, apiKey, documentSummary, documentId, messages, model = DEFAULT_MODEL, signal) {
    var _a;
    try {
        const lastUserMessage = ((_a = messages.filter((m) => m.role === "user").slice(-1)[0]) === null || _a === void 0 ? void 0 : _a.content) || "";
        const cleanUserMessage = lastUserMessage.trim().slice(0, 1000);
        const similarChunks = await (0, vectorStore_1.searchSimilar)({
            query: cleanUserMessage,
            userId: user.id,
            documentId: documentId,
            userApiKey: apiKey,
        });
        let retrievedContext = "";
        if (similarChunks.length > 0) {
            retrievedContext = similarChunks
                .map((chunk) => { var _a; return (_a = chunk.payload) === null || _a === void 0 ? void 0 : _a.text; })
                .filter(Boolean)
                .join("\n---\n");
        }
        else {
            retrievedContext =
                "No specific relevant information found in this document for your query.";
        }
        logger_1.logger.info("INFORMATION RETRIEVED FOR STREAM", {
            userId: user.id,
            documentId: documentId,
        });
        const prompt = (0, exports.buildConversationPrompt)(user.name, documentSummary, messages, retrievedContext);
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        const generativeModel = genAI.getGenerativeModel({
            model: model,
            generationConfig: GEMINI_GENERATION_CONFIG,
        });
        const streamingResult = await generativeModel.generateContentStream({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        for await (const chunk of streamingResult.stream) {
            if (signal === null || signal === void 0 ? void 0 : signal.aborted) {
                const abortErr = Object.assign(new Error("Request aborted"), {
                    name: "AbortError",
                });
                throw abortErr;
            }
            const chunkText = chunk.text();
            if (chunkText) {
                yield chunkText;
            }
        }
    }
    catch (error) {
        logger_1.logger.error("Conversation stream processing failed", {
            userId: user.id,
            documentId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
//# sourceMappingURL=aiService.js.map