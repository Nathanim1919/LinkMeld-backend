"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.embeddingProcessing = exports.EmbeddingTaskType = void 0;
const v3_1 = require("@trigger.dev/sdk/v3");
const vectorStore_1 = require("../ai/services/vectorStore");
const user_service_1 = require("../api/services/user.service");
const Capture_1 = require("../common/models/Capture");
const database_1 = require("../common/config/database");
var EmbeddingTaskType;
(function (EmbeddingTaskType) {
    EmbeddingTaskType["INDEX"] = "INDEX";
    EmbeddingTaskType["DELETE"] = "DELETE";
})(EmbeddingTaskType || (exports.EmbeddingTaskType = EmbeddingTaskType = {}));
exports.embeddingProcessing = (0, v3_1.task)({
    id: "embedding-processing",
    retry: {
        maxAttempts: 3,
        factor: 1.8,
        minTimeoutInMs: 5000,
        maxTimeoutInMs: 30000,
        randomize: true,
    },
    run: async (payload) => {
        var _a, _b;
        await (0, database_1.connectMongo)();
        const { captureId, userId, taskType } = payload;
        const traceId = `[Embedding Processing] [${captureId}] [${taskType}]`;
        const apiKey = await user_service_1.UserService.getGeminiApiKey(userId);
        if (!apiKey) {
            console.error(`${traceId} ❌ API key not found`);
            return;
        }
        console.log(`${traceId} Starting embedding processing...`);
        try {
            const capture = await Capture_1.Capture.findById(captureId);
            if (!capture) {
                console.error(`${traceId} ❌ Capture not found`);
                return;
            }
            switch (taskType) {
                case EmbeddingTaskType.INDEX:
                    console.log(`${traceId} [INDEX] Starting embedding...`);
                    try {
                        const text = (_b = (_a = capture.content) === null || _a === void 0 ? void 0 : _a.clean) === null || _b === void 0 ? void 0 : _b.trim();
                        if (!text || text.length < 50) {
                            console.error(`${traceId} ❌ Text too short for embedding`);
                            return;
                        }
                        await (0, vectorStore_1.indexText)({
                            text,
                            docId: captureId,
                            userId,
                            userApiKey: apiKey,
                        });
                    }
                    catch (error) {
                        const errorMsg = error instanceof Error ? error.message : String(error);
                        console.error(`${traceId} [INDEX] ❌ Error indexing embedding: ${errorMsg}`);
                        return;
                    }
                    break;
                case EmbeddingTaskType.DELETE:
                    console.log(`${traceId} [DELETE] Starting deletion...`);
                    try {
                        await (0, vectorStore_1.deleteTextEmbedding)({
                            docId: captureId,
                            userId,
                        });
                    }
                    catch (error) {
                        const errorMsg = error instanceof Error ? error.message : String(error);
                        console.error(`${traceId} [DELETE] ❌ Error deleting embedding: ${errorMsg}`);
                        return;
                    }
                    console.log(`${traceId} [DELETE] Deletion completed`);
                    break;
            }
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`${traceId} ❌ Error processing embedding: ${errorMsg}`);
            return;
        }
        console.log(`${traceId} ✅ Embedding processing completed`);
    },
});
//# sourceMappingURL=embeddingProcessing.js.map