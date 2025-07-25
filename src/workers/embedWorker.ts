import { Worker, Job } from "bullmq";
import { redisConnection } from "../lib/redisClient";
import { connectMongo } from "../config/database";
import { Capture } from "../models/Capture";
import { indexText } from "../ai/services/vectorStore";
import { logger } from "../utils/logger";

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
        logger.debug(`Job data: ${JSON.stringify(job.data, (key, value) => {
          if (key === "apiKey") return "[REDACTED]";
          return value;
        })}`);

        if (!job.data || !job.data.captureId || !job.data.userId || !job.data.apiKey) {
          logger.error(`Invalid job data: ${JSON.stringify(job.data)}`);
          throw new Error("Invalid job data");
        }

        const { captureId, userId, apiKey } = job.data;
        const traceId = `[Embed Worker] [${captureId}]`;

        try {
          const capture = await Capture.findById(captureId);
          if (!capture || !capture.content?.clean) {
            logger.warn(`${traceId} ❌ Capture not found or empty`);
            return;
          }

          const text = capture.content.clean.trim();
          if (text.length < 50) {
            logger.warn(`${traceId} ⚠️ Text too short for embedding`);
            return;
          }

          await indexText({
            text,
            docId: captureId,
            userId,
            userApiKey: apiKey,
          });

          capture.updatedAt = new Date();
          await capture.save();

          logger.info(`${traceId} ✅ Embedding completed for capture ${captureId}`);
          logger.debug(`Capture updated: ${JSON.stringify(capture)}`);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          logger.error(`${traceId} ❌ Embedding failed: ${errorMsg}`, {
            stack: err.stack,
          });
          throw err; // Re-throw to mark job as failed
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