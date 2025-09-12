"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunkText = chunkText;
function chunkText(text, maxLength = 500) {
    const chunks = [];
    const words = text.split(/(?<=[.!?])\s+/);
    let currentChunk = "";
    for (const word of words) {
        if (currentChunk.length + word.length + 1 > maxLength) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
            }
            currentChunk = word;
        }
        else {
            currentChunk += (currentChunk ? " " : "") + word;
        }
    }
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }
    return chunks;
}
//# sourceMappingURL=chunkText.js.map