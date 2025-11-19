"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiProcessing = void 0;
const v3_1 = require("@trigger.dev/sdk/v3");
const aiService_1 = require("../ai/services/aiService");
const Capture_1 = require("../common/models/Capture");
const database_1 = require("../common/config/database");
exports.aiProcessing = (0, v3_1.task)({
    id: "ai-processing",
    retry: {
        maxAttempts: 3,
        factor: 1.8,
        minTimeoutInMs: 5000,
        maxTimeoutInMs: 30000,
        randomize: true,
    },
    run: async (payload) => {
        var _a, _b, _c, _d;
        await (0, database_1.connectMongo)();
        const { captureId, userId } = payload;
        const traceId = `[AI Processing] [${captureId}]`;
        console.log(`${traceId} Starting AI processing...`);
        try {
            const capture = await Capture_1.Capture.findById(captureId);
            if (!capture) {
                console.error(`${traceId} ❌ Capture not found`);
                return;
            }
            const text = (_b = (_a = capture.content) === null || _a === void 0 ? void 0 : _a.clean) === null || _b === void 0 ? void 0 : _b.trim();
            if (!text || text.length < 50) {
                console.error(`${traceId} ❌ Text too short for AI processing`);
                return;
            }
            const result = await (0, aiService_1.processContent)(text, userId);
            const summary = (_d = (_c = result === null || result === void 0 ? void 0 : result.data) === null || _c === void 0 ? void 0 : _c.summary) === null || _d === void 0 ? void 0 : _d.trim();
            if (!summary || summary.length < 30) {
                console.error(`${traceId} ❌ AI summary too short or empty`);
                return;
            }
            capture.ai = { summary };
            await capture.save();
            console.log(`${traceId} ✅ AI summary generated: ${summary.length} characters`);
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`${traceId} ❌ Error processing AI: ${errorMsg}`);
            return;
        }
    },
});
//# sourceMappingURL=aiProcessing.js.map