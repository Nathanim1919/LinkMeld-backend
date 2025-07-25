import { Queue } from "bullmq";
import { redisConnection } from "../lib/redisClient";

export const pdfQueue = new Queue("pdf-processing", {
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
