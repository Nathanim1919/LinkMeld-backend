import { Worker, Job } from "bullmq";
import { redisConnection } from "../lib/redisClient";
import { connectMongo } from "../config/database";
import { Capture } from "../models/Capture";
import { processContent } from "../ai/services/aiService";

connectMongo();

export const aiWorker = new Worker(
  "ai-queue",
  async (job: Job) => {
    const { captureId, userId } = job.data;
    const traceId = `[AI Worker] [${captureId}]`;

    try {
      const capture = await Capture.findById(captureId);
      if (!capture) {
        console.warn(`${traceId} ❌ Capture not found`);
        return;
      }

      // Set status to processing
      capture.processingStatus = "processing";
      await capture.save();

      const text = capture.content?.clean?.trim();
      if (!text || text.length < 50) {
        console.warn(`${traceId} ⚠️ Not enough content to summarize`);
        capture.processingStatus = "error";
        capture.processingStatusMessage = "Content too short or empty for AI";
        await capture.save();
        return;
      }

      console.log(`${traceId} 🧠 Running AI summarization...`);

      const result = await processContent(text, userId, "kjhsakjdhKJAH");
      const summary = result?.data?.summary?.trim();

      if (!summary || summary.length < 30) {
        console.warn(`${traceId} ⚠️ AI summary too short or empty`);
        capture.processingStatus = "error";
        capture.processingStatusMessage = "AI summary generation failed or empty";
        await capture.save();
        return;
      }

      // Save AI summary and mark complete
      capture.ai = { summary };
      capture.processingStatus = "complete";
      capture.processingStatusMessage = "AI summarization complete";
      await capture.save();

      console.log(`${traceId} ✅ Summary saved, length=${summary.length}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`${traceId} ❌ Failed to process AI summary`, errorMsg);

      // If capture is available, update its status
      try {
        await Capture.findByIdAndUpdate(captureId, {
          processingStatus: "error",
          processingStatusMessage: errorMsg,
        });
      } catch (saveError) {
        console.error(`${traceId} ⚠️ Failed to update status after error`, saveError);
      }
    }
  },
  {
    connection: redisConnection,
    concurrency: 3, // adjust based on your API limits
  }
);
