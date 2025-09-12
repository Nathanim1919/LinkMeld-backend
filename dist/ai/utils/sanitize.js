"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeMarkdown = void 0;
const escapeMarkdown = (text) => {
    return text.replace(/[\*_\[\]()~`>#+=|{}.!\\-]/g, '\\$&');
};
exports.escapeMarkdown = escapeMarkdown;
//# sourceMappingURL=sanitize.js.map