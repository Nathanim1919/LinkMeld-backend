"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUniqueSlug = exports.generateSlug = void 0;
const transliteration_1 = require("transliteration");
const generateSlug = (text, maxLength = 60) => {
    if (!text)
        return 'untitled';
    let slug = (0, transliteration_1.transliterate)(text, {
        replace: [
            ['≈', '~'],
            ['≠', '!=']
        ],
        ignore: ['$', '%', '&', '+', ',', '/', ':', ';', '=', '?', '@', '#']
    });
    slug = slug
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-~]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
    if (!slug) {
        slug = 'untitled';
    }
    if (slug.length > maxLength) {
        slug = slug.substring(0, maxLength).replace(/-+$/, '');
    }
    return slug;
};
exports.generateSlug = generateSlug;
const generateUniqueSlug = async (text, model, field = 'slug', maxAttempts = 5) => {
    let baseSlug = (0, exports.generateSlug)(text);
    let slug = baseSlug;
    let attempt = 1;
    while (attempt <= maxAttempts) {
        const exists = await model.exists({ [field]: slug });
        if (!exists)
            return slug;
        slug = `${baseSlug}-${attempt}`;
        attempt++;
    }
    return `${baseSlug}-${Date.now().toString(36)}`;
};
exports.generateUniqueSlug = generateUniqueSlug;
//# sourceMappingURL=slugify.js.map