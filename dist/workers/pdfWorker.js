"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfWorker = void 0;
const bullmq_1 = require("bullmq");
const redisClient_1 = require("../lib/redisClient");
const pdfProcessor_1 = require("../services/pdfProcessor");
exports.pdfWorker = new bullmq_1.Worker("pdf-processing", async (job) => {
    const { captureId, url } = job.data;
    console.log(`[PDF Worker] Processing job for captureId=${captureId}, url=${url}`);
    await (0, pdfProcessor_1.processPdfCapture)(captureId, url);
}, {
    connection: redisClient_1.redisConnection,
    concurrency: 5,
    autorun: true,
});
//# sourceMappingURL=pdfWorker.js.map