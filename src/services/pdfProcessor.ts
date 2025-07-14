// src/services/pdfProcessor.ts

import { generateSlug } from "../utils/slugify";
import { calculateReadingTime, Capture, countWords } from "../models/Capture";
import { downloadPdf } from "../utils/pdfUtils";
import { uploadPdfToBlob } from "../utils/azureBlob";
import { extractTextFromPdf } from "../utils/extractTextFromPdf";
import { hashContent } from "../utils/hashing";
import { connectMongo } from "../config/database";
import { aiQueue } from "../queue/aiQueue";

// Ensure MongoDB is connected before doing any DB operations
connectMongo();

/**
 * Process a PDF capture:
 * 1. Download the PDF
 * 2. Upload to Azure Blob Storage
 * 3. Extract text content
 * 4. Compute metadata (slug, word count, hash, reading time)
 * 5. Update the MongoDB capture document
 * 6. Enqueue AI summarization task
 *
 * @param captureId - The MongoDB document ID for the capture
 * @param url - The original PDF URL
 */
export async function processPdfCapture(captureId: string, url: string) {
  const traceId = `[PDF Processor] [${captureId}]`; // for better logging context
  console.log(`${traceId} 🚀 Starting PDF processing for: ${url}`);

  try {
    // Step 1: Set initial status
    await Capture.findByIdAndUpdate(captureId, {
      processingStatus: "processing",
      "metadata.capturedAt": new Date(),
    });

    // Step 2: Download the PDF
    const pdfData = await downloadPdf(url);
    console.log(`${traceId} 📥 Downloaded ${pdfData.fileName}, size=${pdfData.size} bytes`);

    // Step 3: Upload to Azure
    const blobUrl = await uploadPdfToBlob(pdfData.buffer, pdfData.fileName);
    console.log(`${traceId} ☁️ Uploaded to Azure: ${blobUrl}`);

    // Step 4: Extract clean text
    const rawText = await extractTextFromPdf(pdfData.buffer);
    const cleanText = rawText.replace(/\s{2,}/g, " ").trim();
    if (!cleanText || cleanText.length < 100) {
      throw new Error("Extracted text is empty or too short");
    }

    // Step 5: Compute metadata
    const title = pdfData.fileName.replace(/\.pdf$/i, "") || "Untitled";
    const slug = generateSlug(title);
    const contentHash = hashContent(cleanText || url); // fallback in case of extraction failure
    const wordCount = countWords(cleanText);
    const readingTime = calculateReadingTime(cleanText);

    // Step 6: Update capture document
    const capture = await Capture.findById(captureId);
    if (!capture) {
      console.error(`${traceId} ❌ Capture not found`);
      throw new Error(`Capture not found: ${captureId}`);
    }

    capture.title = title;
    capture.slug = slug;
    capture.blobUrl = blobUrl;
    capture.content.clean = cleanText;
    capture.contentHash = contentHash;
    capture.metadata = {
      ...capture.metadata,
      type: "document",
      isPdf: true,
      wordCount,
      readingTime,
      capturedAt: new Date(),
    };

    await capture.save();
    console.log(`${traceId} ✅ Updated capture metadata and content`);

    // Step 7: Enqueue AI summarization
    await aiQueue.add("process-ai", {
      captureId: captureId,
      userId: capture.owner?.toString(),
    });

    console.log(`${traceId} 🧠 Queued AI summarization task`);

    return { success: true, captureId, slug, blobUrl };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`${traceId} ❌ Error during PDF processing:`, error);

    // Update status to error for UI
    await Capture.findByIdAndUpdate(captureId, {
      processingStatus: "error",
    });

    // (Optional) Send to error tracking system like Sentry, Datadog, etc.
    // logError({ traceId, error });

    return { success: false, captureId, error };
  }
}
