"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reProcessCapture = exports.getCaptureById = exports.searchCaptures = exports.deleteCapture = exports.getBookmarkedCaptures = exports.toggleBookmark = exports.getCaptures = exports.saveCapture = void 0;
const Capture_1 = require("../common/models/Capture");
const hashing_1 = require("../common/utils/hashing");
const sanitization_1 = require("../common/utils/sanitization");
const slugify_1 = require("../common/utils/slugify");
const urls_1 = require("../common/utils/urls");
const Conversation_1 = __importDefault(require("../common/models/Conversation"));
const mongoose_1 = require("mongoose");
const responseHandlers_1 = require("../common/utils/responseHandlers");
const pdfProcessor_1 = require("../queue/pdfProcessor");
const aiQueue_1 = require("../queue/aiQueue");
const logger_1 = require("../common/utils/logger");
const embedQueue_1 = require("../queue/embedQueue");
const checkRemotePdfSize_1 = require("../common/utils/checkRemotePdfSize");
const MIN_CONTENT_LENGTH = 50;
const MAX_LINKS = 100;
const saveCapture = async (req, res) => {
    var _a, _b, _c;
    try {
        const requiredFields = ["url"];
        const missingFields = requiredFields.filter((field) => !req.body[field]);
        if (missingFields.length > 0) {
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 400,
                message: `Missing required fields: ${missingFields.join(", ")}`,
            });
        }
        const format = req.body.format || detectFormat(req.body.url);
        const isWebpage = format === "webpage";
        const mainText = ((_a = req.body.mainText) === null || _a === void 0 ? void 0 : _a.trim()) || "";
        if (isWebpage && mainText.length < MIN_CONTENT_LENGTH) {
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 400,
                message: "Web content too short to save.",
            });
        }
        const captureData = await prepareCaptureData(req, mainText, format);
        const isPdf = (_b = captureData.metadata) === null || _b === void 0 ? void 0 : _b.isPdf;
        if (isPdf) {
            if (!captureData.url) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 400,
                    message: "Missing URL for PDF capture.",
                });
            }
            const pdfCheckResult = await (0, checkRemotePdfSize_1.checkRemotePdfSize)(captureData.url);
            if (pdfCheckResult.statusCode !== 200) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: pdfCheckResult.statusCode,
                    message: pdfCheckResult.message,
                });
            }
        }
        const capture = await new Capture_1.Capture(captureData).save();
        if (isPdf) {
            await pdfProcessor_1.pdfQueue.add("process-pdf", {
                captureId: capture._id,
                url: capture.url,
            }, {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 5000,
                },
            });
        }
        else {
            logger_1.logger.info(`AI Initializing for capture ${capture._id}`);
            await aiQueue_1.aiQueue.add("process-ai", {
                captureId: capture._id,
                userId: (_c = capture.owner) === null || _c === void 0 ? void 0 : _c.toString(),
            }, {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 5000,
                },
            });
        }
        const conversation = await Conversation_1.default.create({ captureId: capture._id });
        capture.conversation = new mongoose_1.Types.ObjectId(conversation._id);
        await capture.save();
        return (0, responseHandlers_1.SuccessResponse)({
            res,
            statusCode: 201,
            message: "Capture saved successfully",
        });
    }
    catch (error) {
        console.error("[Capture] Save error:", error);
        return (0, responseHandlers_1.ErrorResponse)({
            res,
            statusCode: 500,
            message: "An error occurred while saving capture",
            error: error instanceof Error ? error.message : "Unknown error",
            ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
        });
    }
};
exports.saveCapture = saveCapture;
const prepareCaptureData = async (req, content, format) => {
    var _a;
    const { url, title, description, favicon, siteName, headings, publishedTime, author, keywords, language = "english", userAgent, links = [], } = req.body;
    const isWebpage = format === "webpage";
    const normalizedUrl = await (0, urls_1.normalizeUrl)(url);
    const wordCount = isWebpage ? countWords(content) : 0;
    return {
        owner: req.user.id,
        url: normalizedUrl,
        title: isWebpage
            ? (0, sanitization_1.sanitizeHtml)(title || "Untitled", { allowedTags: [] })
            : undefined,
        slug: isWebpage ? (0, slugify_1.generateSlug)(title || url) : undefined,
        contentHash: isWebpage ? (0, hashing_1.hashContent)(content) : undefined,
        headings: isWebpage ? headings : [],
        format: format,
        processingStatus: isWebpage ? "complete" : "pending",
        content: {
            raw: isWebpage ? content : undefined,
            clean: isWebpage
                ? (0, sanitization_1.sanitizeHtml)(content, { allowedTags: [], allowedAttributes: {} })
                : undefined,
            highlights: [],
            attachments: [],
        },
        metadata: {
            description: (0, sanitization_1.sanitizeHtml)(description || "", { allowedTags: [] }),
            favicon: (0, sanitization_1.sanitizeHtml)(favicon || "", { allowedTags: [] }),
            siteName: (0, sanitization_1.sanitizeHtml)(siteName || "", { allowedTags: [] }),
            publishedAt: publishedTime || undefined,
            capturedAt: new Date(),
            author: (0, sanitization_1.sanitizeHtml)(author || "", { allowedTags: [] }),
            keywords: prepareKeywords(keywords),
            language,
            isPdf: format === "pdf",
            type: format === "webpage" ? "article" : "document",
            wordCount,
            readingTime: isWebpage ? Math.ceil(wordCount / 200) : 0,
        },
        references: prepareLinks(links),
        status: "active",
        version: 1,
        source: {
            ip: req.ip,
            userAgent: (0, sanitization_1.sanitizeHtml)(userAgent || "", { allowedTags: [] }),
            extensionVersion: ((_a = req.headers["x-extension-version"]) === null || _a === void 0 ? void 0 : _a.toString()) || "1.0.0",
            method: "extension",
        },
    };
};
const detectFormat = (url) => {
    if (url.endsWith(".pdf"))
        return "pdf";
    if (url.includes("youtube.com") || url.includes("vimeo.com"))
        return "video";
    return "webpage";
};
const countWords = (text) => text.split(/\s+/).filter(Boolean).length;
const getCaptures = async (req, res) => {
    try {
        const captures = await Capture_1.Capture.find({ owner: req.user.id })
            .populate("collection", "name")
            .sort({ "metadata.capturedAt": -1 })
            .select("-content.raw -content.clean")
            .exec();
        return (0, responseHandlers_1.SuccessResponse)({
            res,
            message: "Captures retrieved successfully",
            data: captures,
        });
    }
    catch (error) {
        console.error("[Capture] Fetch error:", error);
        return (0, responseHandlers_1.ErrorResponse)({
            res,
            statusCode: 500,
            message: "Failed to fetch captures",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.getCaptures = getCaptures;
const toggleBookmark = async (req, res) => {
    try {
        const { captureId } = req.params;
        if (!captureId) {
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 400,
                message: "Capture ID is required",
            });
        }
        const capture = await Capture_1.Capture.findOne({
            _id: captureId,
            owner: req.user.id,
        });
        if (!capture) {
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 404,
                message: "Capture not found",
            });
        }
        capture.bookmarked = !capture.bookmarked;
        await capture.save();
        return (0, responseHandlers_1.SuccessResponse)({
            res,
            message: `Capture ${capture.bookmarked ? "bookmarked" : "unbookmarked"} successfully`,
            data: { captureId: capture._id },
        });
    }
    catch (error) {
        console.error("[Capture] Bookmark error:", error);
        return (0, responseHandlers_1.ErrorResponse)({
            res,
            statusCode: 500,
            message: "Failed to update bookmark status",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.toggleBookmark = toggleBookmark;
const getBookmarkedCaptures = async (req, res) => {
    try {
        const captures = await Capture_1.Capture.find({
            owner: req.user.id,
            bookmarked: true,
        })
            .sort({ "metadata.capturedAt": -1 })
            .populate("collection", "name")
            .exec();
        return (0, responseHandlers_1.SuccessResponse)({
            res,
            message: "Bookmarked captures retrieved successfully",
            data: captures,
        });
    }
    catch (error) {
        console.error("[Capture] Bookmarked fetch error:", error);
        return (0, responseHandlers_1.ErrorResponse)({
            res,
            statusCode: 500,
            message: "Failed to fetch bookmarked captures",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.getBookmarkedCaptures = getBookmarkedCaptures;
const deleteCapture = async (req, res) => {
    var _a;
    try {
        const { captureId } = req.params;
        if (!captureId) {
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 400,
                message: "Capture ID is required",
            });
        }
        const capture = await Capture_1.Capture.findOneAndDelete({
            _id: captureId,
            owner: req.user.id,
        });
        if (!capture) {
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 404,
                message: "Capture not found",
            });
        }
        await embedQueue_1.embedQueue.add("delete-embedding", {
            docId: (_a = capture === null || capture === void 0 ? void 0 : capture._id) === null || _a === void 0 ? void 0 : _a.toString(),
            userId: req.user.id,
        });
        await Conversation_1.default.deleteOne({ captureId: capture._id });
        return (0, responseHandlers_1.SuccessResponse)({
            res,
            message: "Capture deleted successfully",
            data: { captureId: capture._id },
        });
    }
    catch (error) {
        console.error("[Capture] Delete error:", error);
        return (0, responseHandlers_1.ErrorResponse)({
            res,
            statusCode: 500,
            message: "Failed to delete capture",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.deleteCapture = deleteCapture;
const searchCaptures = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || typeof query !== "string") {
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 400,
                message: "Search query is required",
            });
        }
        let captures = await Capture_1.Capture.find({
            owner: req.user.id,
            $text: { $search: query },
        })
            .sort({ "metadata.capturedAt": -1 })
            .populate("collection", "name")
            .exec();
        if (captures.length === 0) {
            captures = await Capture_1.Capture.find({
                owner: req.user.id,
                searchTokens: { $regex: query, $options: "i" },
            })
                .sort({ "metadata.capturedAt": -1 })
                .populate("collection", "name")
                .exec();
        }
        return (0, responseHandlers_1.SuccessResponse)({
            res,
            message: "Search results retrieved successfully",
            data: captures,
        });
    }
    catch (error) {
        return (0, responseHandlers_1.ErrorResponse)({
            res,
            statusCode: 500,
            message: "Failed to search captures",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.searchCaptures = searchCaptures;
const getCaptureById = async (req, res) => {
    try {
        const { captureId } = req.params;
        const capture = await Capture_1.Capture.findOne({
            _id: captureId,
            owner: req.user.id,
        })
            .populate("collection", "name")
            .exec();
        if (!capture) {
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 404,
                message: "Capture not found",
            });
        }
        return (0, responseHandlers_1.SuccessResponse)({
            res,
            message: "Capture retrieved successfully",
            data: capture,
        });
    }
    catch (error) {
        console.error("[Capture] Fetch by ID error:", error);
        return (0, responseHandlers_1.ErrorResponse)({
            res,
            statusCode: 500,
            message: "Failed to fetch capture",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.getCaptureById = getCaptureById;
const prepareKeywords = (keywords) => {
    if (Array.isArray(keywords)) {
        return keywords.map((k) => (0, sanitization_1.sanitizeHtml)(k, { allowedTags: [] }));
    }
    return [(0, sanitization_1.sanitizeHtml)(keywords || "", { allowedTags: [] })];
};
const prepareLinks = (links) => {
    return links
        .filter((link) => link === null || link === void 0 ? void 0 : link.href)
        .slice(0, MAX_LINKS)
        .map((link) => ({
        type: "link",
        url: (0, sanitization_1.sanitizeHtml)(link.href, { allowedTags: [] }),
        title: (0, sanitization_1.sanitizeHtml)(link.text || "No title", { allowedTags: [] }),
    }));
};
const reProcessCapture = async (req, res) => {
    var _a;
    try {
        const { captureId } = req.params;
        const capture = await Capture_1.Capture.findOne({
            _id: captureId,
            owner: req.user.id,
        });
        if (!capture) {
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 404,
                message: "Capture not found",
            });
        }
        if (capture.metadata.isPdf) {
            logger_1.logger.info(`Re-adding PDF processing for capture ${capture._id}`);
            await pdfProcessor_1.pdfQueue.add("process-pdf", {
                captureId: capture._id,
                url: capture.url,
            }, {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 5000,
                },
            });
            logger_1.logger.info(`AI Initializing for re-processing capture ${capture._id}`);
            capture.processingStatus = "processing";
            await capture.save();
        }
        else {
            logger_1.logger.info(`AI Initializing for re-processing capture ${capture._id}`);
            capture.processingStatus = "processing";
            await aiQueue_1.aiQueue.add("process-ai", {
                captureId: capture._id,
                userId: (_a = capture.owner) === null || _a === void 0 ? void 0 : _a.toString(),
            }, {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 5000,
                },
            });
            await capture.save();
        }
        return (0, responseHandlers_1.SuccessResponse)({
            res,
            message: "Capture re-processing initiated successfully",
            data: capture,
        });
    }
    catch (error) {
        console.error("[Capture] Re-process error:", error);
        return (0, responseHandlers_1.ErrorResponse)({
            res,
            statusCode: 500,
            message: "Failed to re-process capture",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.reProcessCapture = reProcessCapture;
//# sourceMappingURL=captureController.js.map