// src/queues/embedQueue.ts
import { Queue } from "bullmq";
import { redisConnection } from "../lib/redisClient";

export const embedQueue = new Queue("embed-queue", {
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