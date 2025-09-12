"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfQueue = void 0;
const bullmq_1 = require("bullmq");
const redisClient_1 = require("../lib/redisClient");
exports.pdfQueue = new bullmq_1.Queue("pdf-processing", {
    connection: redisClient_1.redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: true,
    },
});
//# sourceMappingURL=pdfProcessor.js.map