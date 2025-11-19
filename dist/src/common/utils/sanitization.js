"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeText = exports.sanitizeHtml = void 0;
exports.escapeMarkdown = escapeMarkdown;
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const sanitizeHtml = (dirty, options = {}) => {
    const defaultOptions = {
        allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
        allowedAttributes: {
            'a': ['href', 'title', 'rel']
        },
        allowedSchemes: ['http', 'https', 'mailto'],
        transformTags: {
            'a': sanitize_html_1.default.simpleTransform('a', {
                rel: 'noopener noreferrer',
                target: '_blank'
            })
        },
        exclusiveFilter: (frame) => !frame.text.trim()
    };
    return (0, sanitize_html_1.default)(dirty, { ...defaultOptions, ...options });
};
exports.sanitizeHtml = sanitizeHtml;
const sanitizeText = (text) => {
    return (0, exports.sanitizeHtml)(text, {
        allowedTags: [],
        allowedAttributes: {},
        disallowedTagsMode: 'discard'
    }).trim();
};
exports.sanitizeText = sanitizeText;
function escapeMarkdown(text) {
    return text
        .replace(/([*_`~>])/g, '\\$1')
        .replace(/\[(.*?)\]\((.*?)\)/g, '[$1](<$2>)');
}
//# sourceMappingURL=sanitization.js.map