"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexText = indexText;
exports.deleteTextEmbedding = deleteTextEmbedding;
exports.searchSimilar = searchSimilar;
const qdrant_1 = require("../clients/qdrant");
const chunkText_1 = require("../../common/utils/chunkText");
const embedding_1 = require("../../common/utils/embedding");
const logger_1 = require("../../common/utils/logger");
const withRetry_1 = require("../../common/utils/withRetry");
const uuid_1 = require("uuid");
const VECTOR_SIZE = 3072;
async function indexText({ text, docId, userId, userApiKey, }) {
    const chunks = (0, chunkText_1.chunkText)(text);
    const points = [];
    logger_1.logger.info(`Indexing document ${docId} with ${chunks.length} chunks`);
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await (0, embedding_1.generateGeminiEmbeddingsWithFetch)(chunk, userApiKey, "RETRIEVAL_DOCUMENT", 3, 2000);
        if (embedding !== null) {
            if (!Array.isArray(embedding) || embedding.length !== VECTOR_SIZE) {
                logger_1.logger.error(`Invalid embedding for chunk ${i} of doc ${docId}: Expected ${VECTOR_SIZE} dimensions, got ${embedding.length}`);
                continue;
            }
            points.push({
                id: (0, uuid_1.v4)(),
                vector: embedding,
                payload: {
                    text: chunk,
                    user_id: userId,
                    doc_id: docId,
                    chunk_index: i,
                    created_at: new Date().toISOString(),
                },
            });
            logger_1.logger.debug("First point to upsert:", JSON.stringify(points[0]));
            logger_1.logger.debug(`POINTS: ${points}`);
        }
        else {
            logger_1.logger.warn(`Failed to generate embedding for chunk ${i} of doc ${docId}`);
        }
    }
    if (points.length === 0) {
        logger_1.logger.warn(`No valid points to upsert for doc ${docId}`);
        return;
    }
    await ensureCollection(qdrant_1.qdrant, "documents");
    await (0, withRetry_1.withRetry)(async () => {
        try {
            logger_1.logger.debug(`Upserting ${points.length} points to documents collection`);
            await qdrant_1.qdrant
                .upsert("documents", { points })
                .then((res) => {
                logger_1.logger.info(`THE RESPONSE IS: ${res}`);
                logger_1.logger.info(`Successfully upserted ${points.length} points for doc ${docId}`);
            })
                .catch((err) => {
                logger_1.logger.error(`ERROR OCCURED: ${err}`);
            });
        }
        catch (error) {
            logger_1.logger.error(`Upsert failed for doc ${docId}:`, {
                message: error.message,
                stack: error.stack,
                status: error.status,
                response: error.response
                    ? JSON.stringify(error.response.data, null, 2)
                    : null,
                cause: error.cause,
                points: points.length,
            });
            throw error;
        }
    }, 3, 2000);
}
async function ensureCollection(client, collectionName) {
    try {
        await client.getCollection(collectionName);
        logger_1.logger.debug(`Collection ${collectionName} exists`);
    }
    catch (error) {
        if (error.status === 404) {
            logger_1.logger.info(`Creating collection ${collectionName}`);
            await client.createCollection(collectionName, {
                vectors: {
                    size: VECTOR_SIZE,
                    distance: "Cosine",
                },
            });
            logger_1.logger.info(`Created collection ${collectionName}`);
        }
        else {
            logger_1.logger.error(`Failed to verify collection ${collectionName}:`, error);
            throw error;
        }
    }
}
async function deleteTextEmbedding({ docId, userId, }) {
    logger_1.logger.info(`Deleting embedding for docId=${docId}, userId=${userId}`);
    await ensureCollection(qdrant_1.qdrant, "documents");
    const result = await qdrant_1.qdrant.delete("documents", {
        filter: {
            must: [
                { key: "user_id", match: { value: userId } },
                { key: "doc_id", match: { value: docId } },
            ],
        },
    });
    logger_1.logger.info(`Deleted embedding for docId=${docId}, userId=${userId}`, {
        status: result.status,
        operationId: result.operation_id,
    });
}
async function searchSimilar({ query, userId, documentId, userApiKey, }) {
    const vector = await (0, embedding_1.generateGeminiEmbeddingsWithFetch)(query, userApiKey, "RETRIEVAL_QUERY", 3, 2000);
    if (!vector) {
        throw new Error("Failed to generate vector for the query");
    }
    return await qdrant_1.qdrant.search("documents", {
        vector,
        limit: 5,
        filter: {
            must: [
                { key: "user_id", match: { value: userId } },
                { key: "doc_id", match: { value: documentId } },
            ],
        },
    });
}
//# sourceMappingURL=vectorStore.js.map