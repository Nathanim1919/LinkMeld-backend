// src/queues/aiQueue.ts
import { Queue } from "bullmq";
import { redisConnection } from "../lib/redisClient";

export const aiQueue = new Queue("ai-queue", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000, // Retry after 5 seconds
    },
    removeOnComplete: true,
    removeOnFail: true,
  },
});
