// src/workers/aiWorker.ts

import { Worker, Job } from "bullmq";
import { redisConnection } from "../lib/redisClient";
import { connectMongo } from "../config/database";
import { Capture } from "../models/Capture";
import { processContent } from "../ai/services/aiService";

// Connect to MongoDB before worker starts processing
connectMongo();

/**
 * AI Worker
 * Consumes jobs from 'ai-queue' and performs tasks like summarization
 */
export const aiWorker = new Worker(
  "ai-queue",
  async (job: Job) => {
    const { captureId, userId } = job.data;

    try {
      // Fetch the capture document from MongoDB
      const capture = await Capture.findById(captureId);

      if (!capture) {
        console.warn(`[AI Worker] ❌ Capture not found for ID: ${captureId}`);
        return;
      }

      const text = capture.content?.clean?.trim();

      if (!text) {
        console.warn(`[AI Worker] ⚠️ No clean content found in capture ID: ${captureId}`);
        return;
      }

      console.log(
        `[AI Worker] 🧠 Processing captureId=${captureId}, textLength=${text.length}`
      );

      // Summarize the text using your AI service
      const result = await processContent(text, userId, "kjhsakjdhKJAH");

      const summary = result?.data?.summary?.trim() || "";

      if (!summary) {
        console.warn(`[AI Worker] ⚠️ No summary generated for captureId=${captureId}`);
        return;
      }

      // Update the capture document with AI data
      capture.ai = { summary };
      await capture.save();

      console.log(
        `[AI Worker] ✅ Saved summary (length=${summary.length}) for captureId=${captureId}`
      );
    } catch (error) {
      console.error(
        `[AI Worker] ❌ Error processing captureId=${captureId}`,
        error instanceof Error ? error.message : error
      );
    }
  },
  {
    connection: redisConnection,
    concurrency: 3, // You can scale this depending on AI API rate limits
  }
);
