"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const redisClient_1 = require("../lib/redisClient");
const database_1 = require("../config/database");
const logger_1 = require("../common/utils/logger");
const handleEmbedding_1 = require("../jobs/embed/handleEmbedding");
const handleDeleteEmbedding_1 = require("../jobs/embed/handleDeleteEmbedding");
async function startWorker() {
    try {
        logger_1.logger.info("Starting embed worker...");
        await (0, database_1.connectMongo)();
        logger_1.logger.info("MongoDB connected successfully");
        logger_1.logger.info("Qdrant collection initialized successfully");
        const embedWorker = new bullmq_1.Worker("embed-queue", async (job) => {
            logger_1.logger.info(`Processing embed job: ${job.id}`);
            logger_1.logger.debug(`Job data: ${JSON.stringify(job.data, (key, value) => {
                if (key === "apiKey")
                    return "[REDACTED]";
                return value;
            })}`);
            switch (job.name) {
                case "process-embedding":
                    await (0, handleEmbedding_1.handleEmbedding)(job);
                    break;
                case "delete-embedding":
                    await (0, handleDeleteEmbedding_1.handleDeleteEmbedding)(job);
                    break;
                default:
                    logger_1.logger.warn(`Unknown job name: ${job.name}`);
                    throw new Error(`Unknown job name: ${job.name}`);
            }
        }, {
            connection: redisClient_1.redisConnection,
            concurrency: 2,
        });
        embedWorker.on("ready", () => {
            logger_1.logger.info("Embed worker is ready");
        });
        embedWorker.on("error", (err) => {
            logger_1.logger.error("Embed worker error:", {
                error: err.message,
                stack: err.stack,
            });
        });
        embedWorker.on("failed", (job, err) => {
            logger_1.logger.error(`Job ${job === null || job === void 0 ? void 0 : job.id} failed: ${err.message}`, {
                stack: err.stack,
            });
        });
        embedWorker.on("active", (job) => {
            logger_1.logger.info(`Job ${job.id} is now active`);
        });
        embedWorker.on("completed", (job) => {
            logger_1.logger.info(`Job ${job.id} completed`);
        });
    }
    catch (err) {
        logger_1.logger.error("Failed to start embed worker:", {
            error: err.message,
            stack: err.stack,
        });
        process.exit(1);
    }
}
startWorker();
//# sourceMappingURL=embedWorker.js.map