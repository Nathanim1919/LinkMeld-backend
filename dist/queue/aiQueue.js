"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiQueue = void 0;
const bullmq_1 = require("bullmq");
const redisClient_1 = require("../lib/redisClient");
exports.aiQueue = new bullmq_1.Queue("ai-queue", {
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
//# sourceMappingURL=aiQueue.js.map