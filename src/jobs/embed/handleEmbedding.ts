import { Job } from "bullmq";
import { logger } from "../../utils/logger";
import { Capture } from "../../models/Capture";
import { indexText } from "../../ai/services/vectorStore";

export const handleEmbedding = async (job: Job) => {
  const { captureId, userId, apiKey } = job.data;
  console.log(
    `Processing embedding for captureId=${captureId}, userId=${userId}`
  );

  const traceId = `[Embed Job] [${captureId}]`;
  console.log(`${traceId} Starting embedding process...`);
  try {
    // Job processing logic here

    const capture = await Capture.findById(captureId);
    if (!capture) {
      logger.warn(`${traceId} ❌ Capture not found or empty`);
      return;
    }

    const text = capture.content?.clean?.trim();
    if (!text || text.length < 50) {
      logger.warn(`${traceId} ⚠️ Text too short for embedding`);
      return;
    }

    // Call the embedding service
    await indexText({
      text,
      docId: captureId,
      userId,
      userApiKey: apiKey,
    });
  } catch (error) {
    logger.error(`${traceId} ❌ Error processing embedding: ${error.message}`);
    // Additional error handling logic here
    throw error; // Re-throw to ensure job failure is logged
  }
};
