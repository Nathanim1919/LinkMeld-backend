"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPdfCapture = processPdfCapture;
const slugify_1 = require("../../common/utils/slugify");
const Capture_1 = require("../../common/models/Capture");
const pdfUtils_1 = require("../../common/utils/pdfUtils");
const r2Upload_1 = require("../../common/utils/r2Upload");
const extractTextFromPdf_1 = require("../../common/utils/extractTextFromPdf");
const hashing_1 = require("../../common/utils/hashing");
const withRetry_1 = require("../../common/utils/withRetry");
const database_1 = require("../../common/config/database");
const aiProcessing_1 = require("../../trigger/aiProcessing");
const embeddingProcessing_1 = require("../../trigger/embeddingProcessing");
async function processPdfCapture(captureId, url) {
    var _a, _b;
    const traceId = `[PDF Processor] [${captureId}]`;
    await (0, database_1.connectMongo)();
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
            await (0, r2Upload_1.uploadToR2)(pdfData),
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
        await aiProcessing_1.aiProcessing.trigger({
            captureId,
            userId: ((_a = capture.owner) === null || _a === void 0 ? void 0 : _a.toString()) || "",
        });
        await embeddingProcessing_1.embeddingProcessing.trigger({
            captureId,
            userId: ((_b = capture.owner) === null || _b === void 0 ? void 0 : _b.toString()) || "",
            taskType: embeddingProcessing_1.EmbeddingTaskType.INDEX,
        });
        return { success: true, captureId, slug: (0, slugify_1.generateSlug)(title), blobUrl };
    }
    catch (err) {
        console.error(`${traceId} ❌ Error: ${err instanceof Error ? err.message : err}`);
        await Capture_1.Capture.findByIdAndUpdate(captureId, {
            processingStatus: "error",
        });
        return {
            success: false,
            captureId,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
//# sourceMappingURL=pdfProcessor.js.map