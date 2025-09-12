"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRemotePdfSize = checkRemotePdfSize;
const axios_1 = __importDefault(require("axios"));
const MAX_PDF_SIZE = 5 * 1024 * 1024;
async function checkRemotePdfSize(url) {
    try {
        const response = await axios_1.default.head(url, {
            timeout: 10000,
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; LinkMeldBot/1.0; +https://deepen.live/bot)",
                Accept: "application/pdf",
            },
        });
        const contentType = response.headers["content-type"];
        const contentLength = response.headers["content-length"];
        if (!(contentType === null || contentType === void 0 ? void 0 : contentType.includes("pdf")) || !contentLength) {
            return {
                message: "URL does not return a valid PDF file or missing content-length header.",
                statusCode: 400,
            };
        }
        const size = parseInt(contentLength, 10);
        if (isNaN(size)) {
            return {
                message: "Invalid content-length header.",
                statusCode: 400,
            };
        }
        if (size > MAX_PDF_SIZE) {
            return {
                message: "PDF file exceeds the 5MB limit.",
                statusCode: 400,
            };
        }
        return {
            message: "PDF file is within the size limit.",
            statusCode: 200,
        };
    }
    catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to validate PDF size");
    }
}
//# sourceMappingURL=checkRemotePdfSize.js.map