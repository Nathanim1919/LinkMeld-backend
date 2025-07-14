// src/queues/aiQueue.ts
import { Queue } from "bullmq";
import { redisConnection } from "../lib/redisClient";

export const aiQueue = new Queue("ai-queue", {
  connection: redisConnection,
});
