import { Queue } from "bullmq";
import { redisConnection } from "../lib/redisClient";

export const pdfQueue = new Queue("pdf-processing", {
  connection: redisConnection,
});
