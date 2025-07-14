// src/services/pdfProcessor.ts

import { generateSlug } from "../utils/slugify";
import { calculateReadingTime, Capture, countWords } from "../models/Capture";
import { downloadPdf } from "../utils/pdfUtils";
import { uploadPdfToBlob } from "../utils/azureBlob";
import { extractTextFromPdf } from "../utils/extractTextFromPdf";
import { hashContent } from "../utils/hashing";
import { connectMongo } from "../config/database";

// Ensure MongoDB is connected before doing any DB operations
connectMongo();

/**
 * Process a PDF capture:
 * - Downloads the PDF
 * - Uploads to Azure Blob Storage
 * - Extracts text content
 * - Computes metadata (slug, word count, hash, reading time)
 * - Updates the capture document in MongoDB
 *
 * @param captureId - The MongoDB document ID for the capture
 * @param url - The original URL of the PDF
 * @returns { success, captureId, slug, blobUrl }
 */
export async function processPdfCapture(captureId: string, url: string) {
  console.log(
    `[PDF Processor] Starting for captureId=${captureId}, url=${url}`
  );

  try {
    // 1. Download the PDF from the given URL
    const pdfData = await downloadPdf(url);
    console.log(
      `[PDF Processor] Downloaded: ${pdfData.fileName}, size=${pdfData.size} bytes`
    );

    // 2. Upload the PDF to Azure Blob Storage
    const blobUrl = await uploadPdfToBlob(pdfData.buffer, pdfData.fileName);
    console.log(`[PDF Processor] Uploaded to Azure: ${blobUrl}`);

    // 3. Extract clean text from the PDF
    const rawText = await extractTextFromPdf(pdfData.buffer);
    const cleanText = rawText.replace(/\s{2,}/g, " ").trim();

    // 4. Compute document metadata
    const title = pdfData.fileName.replace(/\.pdf$/i, "") || "Untitled";
    const slug = generateSlug(title);
    const contentHash = hashContent(cleanText || url); // fallback if extraction fails
    const wordCount = countWords(cleanText);
    const readingTime = calculateReadingTime(cleanText);

    // 5. Update the MongoDB document
    const capture = await Capture.findById(captureId);

    if (!capture) {
      console.error(`[PDF Processor] Capture not found: ${captureId}`);
      throw new Error(`Capture with ID ${captureId} not found`);
    }

    capture.title = title;
    capture.slug = slug;
    capture.blobUrl = blobUrl;
    capture.metadata = {
      ...capture.metadata,
      type: "document",
      isPdf: true,
      capturedAt: new Date(),
      wordCount,
      readingTime,
    };
    capture.content.clean = cleanText;
    capture.contentHash = contentHash;

    await capture.save();
    console.log(`[PDF Processor] Updated Capture: ${capture._id}`);

    return { success: true, captureId, slug, blobUrl };
  } catch (error) {
    console.error(`[PDF Processor] Error:`, error);
    throw error;
  }
}
