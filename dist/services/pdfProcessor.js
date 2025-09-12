"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPdfCapture = processPdfCapture;
const slugify_1 = require("../common/utils/slugify");
const Capture_1 = require("../common/models/Capture");
const pdfUtils_1 = require("../common/utils/pdfUtils");
const azureBlob_1 = require("../common/utils/azureBlob");
const extractTextFromPdf_1 = require("../common/utils/extractTextFromPdf");
const hashing_1 = require("../common/utils/hashing");
const database_1 = require("../config/database");
const aiQueue_1 = require("../queue/aiQueue");
const withRetry_1 = require("../common/utils/withRetry");
(0, database_1.connectMongo)();
async function processPdfCapture(captureId, url) {
    var _a;
    const traceId = `[PDF Processor] [${captureId}]`;
    try {
        const capture = await Capture_1.Capture.findByIdAndUpdate(captureId, {
            processingStatus: "processing",
            "metadata.capturedAt": new Date(),
        }, { new: true });
        if (!capture)
            throw new Error("Capture not found");
        const pdfData = await (0, withRetry_1.withRetry)(() => (0, pdfUtils_1.downloadPdf)(url), 3, 2000);
        console.log(`${traceId} Downloaded PDF: ${pdfData.fileName} (${pdfData.size} bytes)`);
        console.log(`${traceId} PDF Text Extracted: ${pdfData}`);
        const [blobUrl, rawText] = await Promise.all([
            (0, azureBlob_1.uploadPdfToBlob)(pdfData.buffer, pdfData.fileName),
            (0, extractTextFromPdf_1.extractTextFromPdf)(pdfData.buffer),
        ]);
        const cleanText = rawText.replace(/\s{2,}/g, " ").trim();
        if (!cleanText || cleanText.length < 100) {
            throw new Error("Text content too short or invalid");
        }
        const title = pdfData.fileName.replace(/\.pdf$/i, "") || "Untitled";
        const metadata = {
            type: "document",
            isPdf: true,
            wordCount: (0, Capture_1.countWords)(cleanText),
            readingTime: (0, Capture_1.calculateReadingTime)(cleanText),
            capturedAt: new Date(),
        };
        await Capture_1.Capture.findByIdAndUpdate(captureId, {
            title,
            slug: (0, slugify_1.generateSlug)(title),
            blobUrl,
            content: { clean: cleanText },
            contentHash: (0, hashing_1.hashContent)(cleanText),
            metadata,
            processingStatus: "ready",
        });
        await aiQueue_1.aiQueue.add(`process-ai:${capture.owner}`, {
            captureId,
            userId: (_a = capture.owner) === null || _a === void 0 ? void 0 : _a.toString(),
        });
        return { success: true, captureId, slug: (0, slugify_1.generateSlug)(title), blobUrl };
    }
    catch (err) {
        console.error(`${traceId} ❌ Error: ${err instanceof Error ? err.message : err}`);
        await Capture_1.Capture.findByIdAndUpdate(captureId, {
            processingStatus: "error",
        });
        return { success: false, captureId, error: err instanceof Error ? err.message : String(err) };
    }
}
//# sourceMappingURL=pdfProcessor.js.map