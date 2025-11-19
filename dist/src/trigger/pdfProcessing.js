"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfProcessing = void 0;
const v3_1 = require("@trigger.dev/sdk/v3");
const pdfProcessor_1 = require("../api/services/pdfProcessor");
exports.pdfProcessing = (0, v3_1.task)({
    id: "pdf-processing",
    retry: {
        maxAttempts: 3,
        factor: 1.8,
        minTimeoutInMs: 5000,
        maxTimeoutInMs: 30000,
        randomize: true,
    },
    run: async (payload) => {
        const { captureId, url } = payload;
        const traceId = `[PDF Processing] [${captureId}] [${url}]`;
        console.log(`${traceId} Starting PDF processing...`);
        try {
            await (0, pdfProcessor_1.processPdfCapture)(captureId, url);
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`${traceId} ❌ Error processing PDF: ${errorMsg}`);
            return;
        }
    },
});
//# sourceMappingURL=pdfProcessing.js.map