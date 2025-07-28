import { Worker, Job } from "bullmq";
import { redisConnection } from "../lib/redisClient";
import { connectMongo } from "../config/database";
import { logger } from "../utils/logger";
import { handleEmbedding } from "../jobs/embed/handleEmbedding";
import { handleDeleteEmbedding } from "../jobs/embed/handleDeleteEmbedding";

async function startWorker() {
  try {
    logger.info("Starting embed worker...");
    await connectMongo();
    logger.info("MongoDB connected successfully");

    logger.info("Qdrant collection initialized successfully");

    const embedWorker = new Worker(
      "embed-queue",
      async (job: Job) => {
        logger.info(`Processing embed job: ${job.id}`);
        logger.debug(
          `Job data: ${JSON.stringify(job.data, (key, value) => {
            if (key === "apiKey") return "[REDACTED]";
            return value;
          })}`
        );

        // Route based on job name
        switch (job.name) {
          case "process-embedding":
            await handleEmbedding(job);
            break;
          case "delete-embedding":
            await handleDeleteEmbedding(job);
            break;
          default:
            logger.warn(`Unknown job name: ${job.name}`);
            throw new Error(`Unknown job name: ${job.name}`);
        }
      },
      {
        connection: redisConnection,
        concurrency: 2,
      }
    );

    embedWorker.on("ready", () => {
      logger.info("Embed worker is ready");
    });

    embedWorker.on("error", (err) => {
      logger.error("Embed worker error:", {
        error: err.message,
        stack: err.stack,
      });
    });

    embedWorker.on("failed", (job, err) => {
      logger.error(`Job ${job?.id} failed: ${err.message}`, {
        stack: err.stack,
      });
    });

    embedWorker.on("active", (job) => {
      logger.info(`Job ${job.id} is now active`);
    });

    embedWorker.on("completed", (job) => {
      logger.info(`Job ${job.id} completed`);
    });
  } catch (err) {
    logger.error("Failed to start embed worker:", {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1); // Exit to trigger Docker restart
  }
}

startWorker();
