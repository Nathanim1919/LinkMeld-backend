"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiWorker = void 0;
const bullmq_1 = require("bullmq");
const redisClient_1 = require("../lib/redisClient");
const database_1 = require("../config/database");
const Capture_1 = require("../common/models/Capture");
const aiService_1 = require("../ai/services/aiService");
const embedQueue_1 = require("../queue/embedQueue");
const user_service_1 = require("../services/user.service");
const logger_1 = require("../common/utils/logger");
(0, database_1.connectMongo)();
exports.aiWorker = new bullmq_1.Worker("ai-queue", async (job) => {
    var _a, _b, _c, _d;
    const { captureId, userId } = job.data;
    const traceId = `[AI Worker] [${captureId}]`;
    const apiKey = await user_service_1.UserService.getGeminiApiKey(userId);
    logger_1.logger.info(`Adding to embed queue: ${captureId}`, {
        captureId,
        userId,
        apiKey,
    });
    await embedQueue_1.embedQueue.add("process-embedding", {
        captureId,
        userId,
        apiKey,
    });
    try {
        const capture = await Capture_1.Capture.findById(captureId);
        if (!capture) {
            console.warn(`${traceId} ❌ Capture not found`);
            return;
        }
        capture.processingStatus = "processing";
        await capture.save();
        const text = (_b = (_a = capture.content) === null || _a === void 0 ? void 0 : _a.clean) === null || _b === void 0 ? void 0 : _b.trim();
        if (!text || text.length < 50) {
            console.warn(`${traceId} ⚠️ Not enough content to summarize`);
            capture.processingStatus = "error";
            capture.processingStatusMessage = "Content too short or empty for AI";
            await capture.save();
            return;
        }
        console.log(`${traceId} 🧠 Running AI summarization...`);
        const result = await (0, aiService_1.processContent)(text, userId);
        const summary = (_d = (_c = result === null || result === void 0 ? void 0 : result.data) === null || _c === void 0 ? void 0 : _c.summary) === null || _d === void 0 ? void 0 : _d.trim();
        if (!summary || summary.length < 30) {
            console.warn(`${traceId} ⚠️ AI summary too short or empty`);
            capture.processingStatus = "error";
            capture.processingStatusMessage =
                "AI summary generation failed or empty";
            await capture.save();
            return;
        }
        capture.ai = { summary };
        capture.processingStatus = "complete";
        capture.processingStatusMessage = "AI summarization complete";
        await capture.save();
        console.log(`${traceId} ✅ Summary saved, length=${summary.length}`);
    }
    catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`${traceId} ❌ Failed to process AI summary`, errorMsg);
        try {
            await Capture_1.Capture.findByIdAndUpdate(captureId, {
                processingStatus: "error",
                processingStatusMessage: errorMsg,
            });
        }
        catch (saveError) {
            console.error(`${traceId} ⚠️ Failed to update status after error`, saveError);
        }
    }
}, {
    connection: redisClient_1.redisConnection,
    concurrency: 3,
});
//# sourceMappingURL=aiWorker.js.map