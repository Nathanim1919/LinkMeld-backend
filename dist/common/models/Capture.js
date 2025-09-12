"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Capture = void 0;
exports.countWords = countWords;
exports.calculateReadingTime = calculateReadingTime;
const mongoose_1 = __importStar(require("mongoose"));
const hashing_1 = require("../utils/hashing");
const slugify_1 = require("../utils/slugify");
const urls_1 = require("../utils/urls");
const HighlightSchema = new mongoose_1.Schema({
    text: { type: String, required: true },
    annotation: String,
    position: { type: [Number], required: true },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, { _id: false });
const AttachmentSchema = new mongoose_1.Schema({
    type: {
        type: String,
        required: true,
        enum: ["pdf", "image", "video", "spreadsheet", "audio"],
    },
    url: { type: String, required: true },
    thumbnail: String,
    size: { type: Number, required: true },
    name: String,
    metadata: Object,
}, { _id: false });
const ReferenceSchema = new mongoose_1.Schema({
    type: {
        type: String,
        required: true,
        enum: ["link", "citation", "embed", "related"],
    },
    url: String,
    title: String,
    capture: { type: mongoose_1.Schema.Types.ObjectId, ref: "Capture" },
    position: [Number],
}, { _id: false });
const CaptureSchema = new mongoose_1.Schema({
    owner: { type: mongoose_1.Types.ObjectId, ref: "User", required: true, index: true },
    workspace: { type: mongoose_1.Types.ObjectId, ref: "Workspace", index: true },
    bookmarked: { type: Boolean, default: false },
    collection: { type: mongoose_1.Types.ObjectId, ref: "Collection", index: true },
    url: {
        type: String,
        required: true,
        validate: {
            validator: isValidUrl,
            message: "Invalid URL format",
        },
        index: true,
    },
    canonicalUrl: {
        type: String,
        validate: {
            validator: isValidUrl,
            message: "Invalid URL format",
        },
    },
    title: {
        type: String,
        required: function () {
            return this.format === "webpage";
        },
        trim: true,
        maxlength: 500,
    },
    headings: [
        {
            level: { type: Number, required: true },
            text: { type: String, required: true },
        },
    ],
    slug: { type: String, index: true },
    contentHash: {
        type: String,
        required: function () {
            return this.format === "webpage";
        },
        index: true,
    },
    format: {
        type: String,
        enum: ["webpage", "pdf", "video", "image", "audio", "document", "other"],
        default: "webpage",
        index: true,
    },
    ai: {
        summary: { type: String, default: "" },
        embeddings: { type: [Number], default: [] },
    },
    blobUrl: { type: String },
    isDuplicate: { type: Boolean, default: false },
    duplicateOf: { type: mongoose_1.Types.ObjectId, ref: "Capture", default: null },
    conversation: { type: mongoose_1.Schema.Types.ObjectId, ref: "Conversation" },
    content: {
        raw: { type: String, select: false },
        clean: {
            type: String,
            required: function () {
                return this.format === "webpage";
            },
        },
        markdown: { type: String },
        highlights: { type: [HighlightSchema], default: [] },
        attachments: { type: [AttachmentSchema], default: [] },
    },
    metadata: {
        description: { type: String, default: "" },
        favicon: String,
        siteName: String,
        language: {
            type: String,
            default: "english",
        },
        keywords: { type: [String], default: [] },
        isPdf: { type: Boolean, default: false },
        publishedAt: Date,
        capturedAt: { type: Date, default: Date.now },
        type: {
            type: String,
            enum: ["article", "document", "product", "discussion", "code", "other"],
            default: "article",
        },
        wordCount: { type: Number, default: 0 },
        readingTime: { type: Number, default: 0 },
    },
    references: { type: [ReferenceSchema], default: [] },
    status: {
        type: String,
        enum: ["active", "archived", "deleted"],
        default: "active",
        index: true,
    },
    privacy: {
        type: String,
        enum: ["private", "workspace", "public"],
        default: "private",
        index: true,
    },
    version: { type: Number, default: 1 },
    processingStatus: {
        type: String,
        enum: ["pending", "processing", "complete", "error"],
        default: "pending",
    },
    processingStatusMessage: {
        type: String,
    },
    source: {
        ip: String,
        userAgent: String,
        extensionVersion: { type: String, required: true },
        method: {
            type: String,
            enum: ["extension", "upload", "api", "import"],
            default: "extension",
        },
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
CaptureSchema.index({
    slug: 1,
    owner: 1,
    format: 1,
}, {
    unique: true,
    name: "unique_slug_per_owner_format",
});
CaptureSchema.index({ owner: 1, status: 1, createdAt: -1 });
CaptureSchema.index({ title: "text", "content.clean": "text" }, {
    name: "content_search",
    weights: {
        title: 10,
        "content.clean": 3,
    },
});
CaptureSchema.index({ contentHash: 1, owner: 1 }, { unique: true });
CaptureSchema.pre("save", async function (next) {
    var _a, _b, _c, _d, _e;
    if (!this.slug) {
        const fallbackTitle = ((_a = this.title) === null || _a === void 0 ? void 0 : _a.trim()) || "Untitled";
        if (fallbackTitle.toLowerCase() === "untitled") {
            const base = this.url || new Date().toISOString();
            this.slug = `${(0, slugify_1.generateSlug)("untitled")}-${(0, hashing_1.hashContent)(base).slice(0, 8)}`;
        }
        else {
            this.slug = (0, slugify_1.generateSlug)(fallbackTitle);
        }
    }
    if (this.isModified("url")) {
        this.canonicalUrl = this.canonicalUrl || (await (0, urls_1.normalizeUrl)(this.url));
    }
    const cleanContent = (_d = (_c = (_b = this.content) === null || _b === void 0 ? void 0 : _b.clean) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : "";
    if ((this.isModified("content.clean") || this.isNew) && !this.contentHash) {
        if (cleanContent.length > 0) {
            this.contentHash = (0, hashing_1.hashContent)(cleanContent);
            this.metadata.wordCount = countWords(cleanContent);
            this.metadata.readingTime = calculateReadingTime(cleanContent);
        }
        else if (((_e = this.metadata) === null || _e === void 0 ? void 0 : _e.isPdf) && this.url) {
            this.contentHash = (0, hashing_1.hashContent)(this.url);
            this.metadata.wordCount = 0;
            this.metadata.readingTime = 0;
        }
        else {
            this.contentHash = "";
            this.metadata.wordCount = 0;
            this.metadata.readingTime = 0;
        }
    }
    if (this.isNew) {
        this.version = 1;
    }
    else {
        this.version += 1;
    }
    next();
});
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    }
    catch (_a) {
        return false;
    }
}
function countWords(text) {
    return text === null || text === void 0 ? void 0 : text.split(/\s+/).filter((w) => w.length > 0).length;
}
function calculateReadingTime(text) {
    const wpm = 200;
    return Math.ceil(countWords(text) / wpm);
}
exports.Capture = mongoose_1.default.model("Capture", CaptureSchema);
//# sourceMappingURL=Capture.js.map