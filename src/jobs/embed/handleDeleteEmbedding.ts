import { Job } from "bullmq";
import { logger } from "../../utils/logger";
import { deleteTextEmbedding } from "../../ai/services/vectorStore";
import { withRetry } from "src/utils/withRetry";

export async function handleDeleteEmbedding(job: Job) {
  const { docId, userId } = job.data;
  const traceId = `[Embed Worker] [Delete ${docId}]`;

  if (!docId || !userId) {
    logger.error(`${traceId} ❌ Missing docId or userId`);
    throw new Error("Missing docId or userId for delete-embedding");
  }

  try {
    await withRetry(() => deleteTextEmbedding({ docId, userId }));
    logger.info(`${traceId} ✅ Embedding deleted`);
  } catch (err) {
    logger.error(`${traceId} ❌ Failed to delete embedding: ${err.message}`);
    throw err;
  }
}
