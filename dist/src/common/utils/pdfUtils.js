"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadPdf = downloadPdf;
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
async function downloadPdf(url) {
    console.log(`[PDF Download] Starting download from ${url}`);
    try {
        const response = await axios_1.default.get(url, {
            responseType: "arraybuffer",
            timeout: 15000,
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; LinkMeldBot/1.0; +https://linkmeld.com/bot)",
                Accept: "application/pdf",
            },
        });
        const contentType = response.headers["content-type"] || "";
        const contentDisposition = response.headers["content-disposition"] || "";
        if (!contentType.includes("application/pdf") &&
            !url.toLowerCase().endsWith(".pdf")) {
            throw new Error("URL does not return a valid PDF file");
        }
        let fileName = "document.pdf";
        const match = contentDisposition.match(/filename="?(.+?)"?$/i);
        if (match) {
            fileName = match[1];
        }
        else {
            const parsed = new URL(url);
            fileName = path_1.default.basename(parsed.pathname) || fileName;
        }
        return {
            buffer: Buffer.from(response.data),
            size: response.data.byteLength,
            fileName,
            contentType,
        };
    }
    catch (err) {
        console.error(`[PDF Download] Error downloading from ${url}`, err);
        throw new Error("Failed to download PDF");
    }
}
//# sourceMappingURL=pdfUtils.js.map