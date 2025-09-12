"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTextFromPdf = extractTextFromPdf;
const pdf_parse_1 = __importDefault(require("pdf-parse"));
async function extractTextFromPdf(buffer) {
    var _a;
    try {
        const data = await (0, pdf_parse_1.default)(buffer);
        return ((_a = data.text) === null || _a === void 0 ? void 0 : _a.trim()) || "";
    }
    catch (err) {
        console.error("Failed to extract text from PDF:", err);
        return "";
    }
}
//# sourceMappingURL=extractTextFromPdf.js.map