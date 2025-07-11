import { Request, Response } from "express";
import { Capture, ICapture } from "../models/Capture";
import { hashContent } from "../utils/hashing";
import { sanitizeHtml } from "../utils/sanitization";
import { generateSlug } from "../utils/slugify";
import { normalizeUrl } from "../utils/urls";
import Conversation from "../models/Conversation";
import mongoose from "mongoose";
import { ErrorResponse, SuccessResponse } from "../utils/responseHandlers";

// Constants
const MIN_CONTENT_LENGTH = 50;
const DEFAULT_PAGE_SIZE = 10;
const MAX_DOCUMENTS = 20;
const MAX_LINKS = 100;

/**
 * Saves a new webpage capture with full content processing
 * @param req Express request with capture data
 * @param res Express response
 */
export const saveCapture = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // 1. Input Validation
    const requiredFields = ["url", "timestamp"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return ErrorResponse({
        res,
        statusCode: 400,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const {
      url,
      title,
      description,
      mainText,
      selectedText,
      documents = [],
      links = [],
      favicon,
      headings,
      siteName,
      publishedTime,
      author,
      keywords,
      viewport,
      language = "en",
      userAgent,
    } = req.body;

    // 2. Content Validation
    const contentToSave = selectedText?.trim() || mainText?.trim() || "";
    if (contentToSave.length < MIN_CONTENT_LENGTH) {
      return ErrorResponse({
        res,
        statusCode: 400,
        message: `Content too short (minimum ${MIN_CONTENT_LENGTH} characters required)`,
      });
    }

    // 3. Process Capture Data
    const captureData = prepareCaptureData(req, contentToSave);

    // 4. Check for Duplicates
    const existingCapture = await Capture.findOne({
      $or: [
        { slug: captureData.slug },
        { contentHash: captureData.contentHash },
      ],
    });

    if (existingCapture) {
      return ErrorResponse({
        res,
        statusCode: 409,
        message: "This webpage has already been captured",
        data: { captureId: existingCapture._id },
      });
    }

    // 5. Save to Database
    const capture = await new Capture(captureData).save();
    const conversation = await Conversation.create({ captureId: capture._id });

    capture.conversation = new mongoose.Types.ObjectId(conversation._id);
    await capture.save();

    // 6. Return Success Response
    return SuccessResponse({
      res,
      statusCode: 201,
      message: "Capture saved successfully",
      data: {
        id: capture._id,
        url: capture.url,
        title: capture.title,
        contentLength: capture.metadata.wordCount,
        documents: capture.documents?.length || 0,
        timestamp: capture.metadata.capturedAt,
        ai: capture.ai,
      },
    });
  } catch (error) {
    console.error("[Capture] Save error:", error);
    return ErrorResponse({
      res,
      statusCode: 500,
      message: "An error occurred while saving capture",
      error: error instanceof Error ? error.message : "Unknown error",
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    });
  }
};

/**
 * Helper function to prepare capture data
 */
const prepareCaptureData = (
  req: Request,
  content: string
): Partial<ICapture> => {
  const {
    url,
    title,
    description,
    documents = [],
    links = [],
    favicon,
    siteName,
    headings,
    publishedTime,
    author,
    keywords,
    viewport,
    language = "en",
    userAgent,
  } = req.body;

  const isPdf = !!url.match(/\.pdf($|\?)/i);
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return {
    owner: req.user.id,
    url: normalizeUrl(url),
    title: sanitizeHtml(title || "Untitled", { allowedTags: [] }),
    slug: generateSlug(title || url),
    contentHash: hashContent(content),
    headings,
    content: {
      raw: content,
      clean: sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} }),
      highlights: [],
      attachments: [],
    },

    metadata: {
      description: sanitizeHtml(description || "", { allowedTags: [] }),
      favicon: sanitizeHtml(favicon || "", { allowedTags: [] }),
      siteName: sanitizeHtml(siteName || "", { allowedTags: [] }),
      publishedAt: sanitizeHtml(publishedTime || "", { allowedTags: [] }),
      author: sanitizeHtml(author || "", { allowedTags: [] }),
      keywords: prepareKeywords(keywords),
      viewport: sanitizeHtml(viewport || "", { allowedTags: [] }),
      language: normalizeLanguage(language),
      isPdf,
      type: isPdf ? "document" : "article",
      wordCount,
      readingTime: Math.ceil(wordCount / 200),
    },

    documents: prepareDocuments(documents),
    references: prepareLinks(links),

    status: "active",
    version: 1,
    source: {
      ip: req.ip,
      userAgent: sanitizeHtml(userAgent || "", { allowedTags: [] }),
      extensionVersion:
        req.headers["x-extension-version"]?.toString() || "1.0.0",
    },

    searchTokens: [
      ...(title?.toLowerCase().split(/\s+/) || []),
      ...(description?.toLowerCase().split(/\s+/) || []),
    ],
  };
};

/**
 * Gets all captures for the authenticated user
 */
export const getCaptures = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const captures = await Capture.find({ owner: req.user.id })
      .populate("collection", "name")
      .sort({ "metadata.capturedAt": -1 })
      .select("-content.raw -content.clean") // Exclude raw content for performance
      .exec();

    return SuccessResponse({
      res,
      message: "Captures retrieved successfully",
      data: captures,
    });
  } catch (error) {
    console.error("[Capture] Fetch error:", error);
    return ErrorResponse({
      res,
      statusCode: 500,
      message: "Failed to fetch captures",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
/**
 * Toggles bookmark status for a capture
 */
export const toggleBookmark = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { captureId } = req.params;

    if (!captureId) {
      return ErrorResponse({
        res,
        statusCode: 400,
        message: "Capture ID is required",
      });
    }

    const capture = await Capture.findOne({
      _id: captureId,
      owner: req.user.id,
    });

    if (!capture) {
      return ErrorResponse({
        res,
        statusCode: 404,
        message: "Capture not found",
      });
    }

    capture.bookmarked = !capture.bookmarked;
    await capture.save();

    return SuccessResponse({
      res,
      message: `Capture ${
        capture.bookmarked ? "bookmarked" : "unbookmarked"
      } successfully`,
      data: { captureId: capture._id },
    });
  } catch (error) {
    console.error("[Capture] Bookmark error:", error);
    return ErrorResponse({
      res,
      statusCode: 500,
      message: "Failed to update bookmark status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Gets all bookmarked captures for the authenticated user
 */
export const getBookmarkedCaptures = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const captures = await Capture.find({
      owner: req.user.id,
      bookmarked: true,
    })
      .sort({ "metadata.capturedAt": -1 })
      .populate("collection", "name")
      .exec();

    return SuccessResponse({
      res,
      message: "Bookmarked captures retrieved successfully",
      data: captures,
    });
  } catch (error) {
    console.error("[Capture] Bookmarked fetch error:", error);
    return ErrorResponse({
      res,
      statusCode: 500,
      message: "Failed to fetch bookmarked captures",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Searches captures with pagination support
 */
export const searchCaptures = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== "string") {
      return ErrorResponse({
        res,
        statusCode: 400,
        message: "Search query is required",
      });
    }

    // Primary full-text search
    let captures = await Capture.find({
      owner: req.user.id,
      $text: { $search: query },
    })
      .sort({ "metadata.capturedAt": -1 })
      .populate("collection", "name")
      .exec();

    // Fallback to regex search if no results
    if (captures.length === 0) {
      captures = await Capture.find({
        owner: req.user.id,
        searchTokens: { $regex: query, $options: "i" },
      })
        .sort({ "metadata.capturedAt": -1 })
        .populate("collection", "name")
        .exec();
    }

    return SuccessResponse({
      res,
      message: "Search results retrieved successfully",
      data: captures,
    });
  } catch (error) {
    return ErrorResponse({
      res,
      statusCode: 500,
      message: "Failed to search captures",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Gets a single capture by ID
 */
export const getCaptureById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { captureId } = req.params;

    const capture = await Capture.findOne({
      _id: captureId,
      owner: req.user.id,
    })
      .populate("collection", "name")
      .exec();

    if (!capture) {
      return ErrorResponse({
        res,
        statusCode: 404,
        message: "Capture not found",
      });
    }

    return SuccessResponse({
      res,
      message: "Capture retrieved successfully",
      data: capture,
    });
  } catch (error) {
    console.error("[Capture] Fetch by ID error:", error);
    return ErrorResponse({
      res,
      statusCode: 500,
      message: "Failed to fetch capture",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Helper functions
const normalizeLanguage = (lang: string): string => {
  const supportedLanguages = [
    "none",
    "da",
    "nl",
    "english",
    "fi",
    "french",
    "german",
    "hungarian",
    "italian",
    "nb",
    "pt",
    "ro",
    "ru",
    "es",
    "sv",
    "tr",
  ];

  const languageMap: Record<string, string> = {
    en: "english",
    "en-US": "english",
    "en-GB": "english",
    es: "spanish",
    fr: "french",
    de: "german",
    pt: "portuguese",
    it: "italian",
    ru: "russian",
  };

  if (!lang) return "english";

  const baseLang = lang.split("-")[0].toLowerCase();
  const normalized = languageMap[baseLang] || languageMap[lang.toLowerCase()];

  return supportedLanguages.includes(normalized) ? normalized : "english";
};

const prepareKeywords = (keywords: string | string[]): string[] => {
  if (Array.isArray(keywords)) {
    return keywords.map((k) => sanitizeHtml(k, { allowedTags: [] }));
  }
  return [sanitizeHtml(keywords || "", { allowedTags: [] })];
};

const prepareDocuments = (
  documents: any[]
): Array<{ url: string; type: string }> => {
  return documents
    .filter((doc) => doc?.url && doc?.type)
    .slice(0, MAX_DOCUMENTS)
    .map((doc) => ({
      url: sanitizeHtml(doc.url, { allowedTags: [] }),
      type: sanitizeHtml(doc.type.toLowerCase(), { allowedTags: [] }),
    }));
};

const prepareLinks = (
  links: any[]
): Array<{ type: string; url: string; title: string }> => {
  return links
    .filter((link) => link?.href)
    .slice(0, MAX_LINKS)
    .map((link) => ({
      type: "link",
      url: sanitizeHtml(link.href, { allowedTags: [] }),
      title: sanitizeHtml(link.text || "No title", { allowedTags: [] }),
    }));
};
