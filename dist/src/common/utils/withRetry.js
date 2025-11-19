"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = withRetry;
async function withRetry(fn, retries = 3, delayMs = 1000) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        }
        catch (e) {
            if (attempt === retries)
                throw e;
            await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        }
    }
    throw new Error("Failed after retries");
}
//# sourceMappingURL=withRetry.js.map