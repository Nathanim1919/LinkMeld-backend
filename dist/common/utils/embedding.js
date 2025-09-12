"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGeminiEmbeddingsWithFetch = generateGeminiEmbeddingsWithFetch;
const generative_ai_1 = require("@google/generative-ai");
const withRetry_1 = require("../../common/utils/withRetry");
const logger_1 = require("../../common/utils/logger");
async function generateGeminiEmbeddingsWithFetch(text, apiKey, taskType = generative_ai_1.TaskType.RETRIEVAL_DOCUMENT, maxRetries = 3, initialDelay = 2000) {
    const EMBEDDING_MODEL = "gemini-embedding-001";
    const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;
    logger_1.logger.info("Generating embeddings with Gemini API...");
    const requestBody = {
        content: {
            parts: [{ text: text }]
        },
        taskType: taskType,
    };
    const controller = new AbortController();
    try {
        const response = await (0, withRetry_1.withRetry)(() => fetch(ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        }), maxRetries, initialDelay);
        if (!response.ok) {
            const errorData = await response.json();
            logger_1.logger.error("Gemini API error response", {
                status: response.status,
                statusText: response.statusText,
                error: errorData,
            });
            throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }
        const data = (await response.json());
        logger_1.logger.debug("Embedding response data", {
            status: response.status,
            data: data,
            taskType: taskType,
        });
        if (data.embedding && Array.isArray(data.embedding.values) && data.embedding.values.length > 0) {
            logger_1.logger.info("Embeddings generated successfully", {
                embeddingSize: data.embedding.values.length,
                taskType: taskType,
            });
            logger_1.logger.info("Embeddings generated successfully", {
                embeddingSize: data.embedding.values.length,
                taskType: taskType,
            });
            return data.embedding.values;
        }
        else {
            console.error("Invalid embedding response structure or empty embedding values:", data);
            return null;
        }
    }
    catch (error) {
        logger_1.logger.error("Failed to generate embeddings after retries:", { error: error.message });
        return null;
    }
}
//# sourceMappingURL=embedding.js.map