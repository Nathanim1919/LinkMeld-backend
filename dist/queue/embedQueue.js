"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.embedQueue = void 0;
const bullmq_1 = require("bullmq");
const redisClient_1 = require("../lib/redisClient");
exports.embedQueue = new bullmq_1.Queue("embed-queue", {
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
//# sourceMappingURL=embedQueue.js.map