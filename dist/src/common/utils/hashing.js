"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareContent = exports.shortFingerprint = exports.hashContent = void 0;
const crypto_1 = require("crypto");
const hashContent = (content, algorithm = 'sha256') => {
    if (!content)
        return '';
    const normalized = content
        .replace(/\s+/g, ' ')
        .normalize('NFKC')
        .trim();
    return (0, crypto_1.createHash)(algorithm)
        .update(normalized)
        .digest('hex');
};
exports.hashContent = hashContent;
const shortFingerprint = (content, length = 16) => {
    return (0, exports.hashContent)(content).substring(0, length);
};
exports.shortFingerprint = shortFingerprint;
const compareContent = (a, b) => {
    if (!a || !b)
        return 0;
    if (a === b)
        return 1;
    const hashA = (0, exports.hashContent)(a);
    const hashB = (0, exports.hashContent)(b);
    return hashA === hashB ? 1 : 0;
};
exports.compareContent = compareContent;
//# sourceMappingURL=hashing.js.map