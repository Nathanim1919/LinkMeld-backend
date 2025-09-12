"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDeleteEmbedding = handleDeleteEmbedding;
const logger_1 = require("../../common/utils/logger");
const vectorStore_1 = require("../../ai/services/vectorStore");
const withRetry_1 = require("../../common/utils/withRetry");
async function handleDeleteEmbedding(job) {
    const { docId, userId } = job.data;
    const traceId = `[Embed Worker] [Delete ${docId}]`;
    if (!docId || !userId) {
        logger_1.logger.error(`${traceId} ❌ Missing docId or userId`);
        throw new Error("Missing docId or userId for delete-embedding");
    }
    try {
        await (0, withRetry_1.withRetry)(() => (0, vectorStore_1.deleteTextEmbedding)({ docId, userId }));
        logger_1.logger.info(`${traceId} ✅ Embedding deleted`);
    }
    catch (err) {
        logger_1.logger.error(`${traceId} ❌ Failed to delete embedding: ${err.message}`);
        throw err;
    }
}
//# sourceMappingURL=handleDeleteEmbedding.js.map