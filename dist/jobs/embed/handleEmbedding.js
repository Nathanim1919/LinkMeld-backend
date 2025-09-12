"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleEmbedding = void 0;
const logger_1 = require("../../common/utils/logger");
const Capture_1 = require("../../common/models/Capture");
const vectorStore_1 = require("../../ai/services/vectorStore");
const handleEmbedding = async (job) => {
    var _a, _b;
    const { captureId, userId, apiKey } = job.data;
    console.log(`Processing embedding for captureId=${captureId}, userId=${userId}`);
    const traceId = `[Embed Job] [${captureId}]`;
    console.log(`${traceId} Starting embedding process...`);
    try {
        const capture = await Capture_1.Capture.findById(captureId);
        if (!capture) {
            logger_1.logger.warn(`${traceId} ❌ Capture not found or empty`);
            return;
        }
        const text = (_b = (_a = capture.content) === null || _a === void 0 ? void 0 : _a.clean) === null || _b === void 0 ? void 0 : _b.trim();
        if (!text || text.length < 50) {
            logger_1.logger.warn(`${traceId} ⚠️ Text too short for embedding`);
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
        logger_1.logger.error(`${traceId} ❌ Error processing embedding: ${error.message}`);
        throw error;
    }
};
exports.handleEmbedding = handleEmbedding;
//# sourceMappingURL=handleEmbedding.js.map