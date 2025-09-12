import { Worker } from "bullmq";
import { redisConnection } from "../lib/redisClient";
import { processPdfCapture } from "../services/pdfProcessor";

// Create a worker for processing PDF captures
export const pdfWorker = new Worker(
  "pdf-processing",
  async (job) => {
    const { captureId, url } = job.data;
    console.log(`[PDF Worker] Processing job for captureId=${captureId}, url=${url}`);  
    await processPdfCapture(captureId, url);
  },
  {
    connection: redisConnection,
    concurrency: 5, // Adjust based on your server capacity
    autorun: true, // Automatically start the worker
  }
);
