// src/controllers/captureController.ts

import { Request, Response } from "express";
import { Capture } from "../models/Capture";
import { hashContent } from "../utils/hashing";
import { sanitizeHtml } from "../utils/sanitization";
import { generateSlug } from "../utils/slugify";
import { normalizeUrl } from "../utils/urls";
import Conversation from "../models/Conversation";
import { Types } from "mongoose";
import { ErrorResponse, SuccessResponse } from "../utils/responseHandlers";
import { ICapture } from "../types/capureTypes";
import { pdfQueue } from "../queue/pdfProcessor";
import { aiQueue } from "../queue/aiQueue";

// Constants
const MIN_CONTENT_LENGTH = 50;
const MAX_LINKS = 100;

/**
 * Saves a new webpage or media capture
 */
export const saveCapture = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const requiredFields = ["url"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return ErrorResponse({
        res,
        statusCode: 400,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const format = req.body.format || detectFormat(req.body.url);
    const isWebpage = format === "webpage";

    const mainText = req.body.mainText?.trim() || "";
    if (isWebpage && mainText.length < MIN_CONTENT_LENGTH) {
      return ErrorResponse({
        res,
        statusCode: 400,
        message: "Web content too short to save.",
      });
    }

    const captureData = await prepareCaptureData(req, mainText, format);

    const capture = await new Capture(captureData).save();

    const conversation = await Conversation.create({ captureId: capture._id });
    capture.conversation = new Types.ObjectId(conversation._id);
    await capture.save();

    if (capture.metadata.isPdf) {
      // Add to PDF processing queue
      await pdfQueue.add(
        "process-pdf",
        {
          captureId: capture._id,
          url: capture.url,
        },
        {
          attempts: 3, // Total tries including the first attempt
          backoff: {
            type: "exponential", // or "fixed"
            delay: 5000, // milliseconds
          },
        }
      );
    } else {
      await aiQueue.add(
        "process-ai",
        {
          captureId: capture._id,
          userId: capture.owner?.toString(),
        },
        {
          attempts: 3, // Total tries including the first attempt
          backoff: {
            type: "exponential", // or "fixed"
            delay: 5000, // milliseconds
          },
        }
      );
    }

    return SuccessResponse({
      res,
      statusCode: 201,
      message: "Capture saved successfully",
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
 * Prepares capture data for storage
 */
const prepareCaptureData = async (
  req: Request,
  content: string,
  format: string
): Promise<Partial<ICapture>> => {
  const {
    url,
    title,
    description,
    favicon,
    siteName,
    headings,
    publishedTime,
    author,
    keywords,
    language = "english",
    userAgent,
    // documents = [],
    links = [],
  } = req.body;

  const isWebpage = format === "webpage";
  const normalizedUrl = await normalizeUrl(url);
  const wordCount = isWebpage ? countWords(content) : 0;

  return {
    owner: req.user.id,
    url: normalizedUrl,
    title: isWebpage
      ? sanitizeHtml(title || "Untitled", { allowedTags: [] })
      : undefined,
    slug: isWebpage ? generateSlug(title || url) : undefined,
    contentHash: isWebpage ? hashContent(content) : undefined,
    headings: isWebpage ? headings : [],

    format: format as ICapture["format"],
    processingStatus: isWebpage ? "complete" : "pending",

    content: {
      raw: isWebpage ? content : undefined,
      clean: isWebpage
        ? sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} })
        : undefined,
      highlights: [],
      attachments: [],
    },

    metadata: {
      description: sanitizeHtml(description || "", { allowedTags: [] }),
      favicon: sanitizeHtml(favicon || "", { allowedTags: [] }),
      siteName: sanitizeHtml(siteName || "", { allowedTags: [] }),
      publishedAt: publishedTime || undefined,
      capturedAt: new Date(),
      author: sanitizeHtml(author || "", { allowedTags: [] }),
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
      userAgent: sanitizeHtml(userAgent || "", { allowedTags: [] }),
      extensionVersion:
        req.headers["x-extension-version"]?.toString() || "1.0.0",
      method: "extension", // or detect from headers later
    },
  };
};

// Util to detect format from URL
const detectFormat = (url: string): ICapture["format"] => {
  if (url.endsWith(".pdf")) return "pdf";
  if (url.includes("youtube.com") || url.includes("vimeo.com")) return "video";
  return "webpage";
};

const countWords = (text: string): number =>
  text.split(/\s+/).filter(Boolean).length;

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

const prepareKeywords = (keywords: string | string[]): string[] => {
  if (Array.isArray(keywords)) {
    return keywords.map((k) => sanitizeHtml(k, { allowedTags: [] }));
  }
  return [sanitizeHtml(keywords || "", { allowedTags: [] })];
};

const prepareLinks = (
  links: any[]
): Array<{ type: "link"; url: string; title: string }> => {
  return links
    .filter((link) => link?.href)
    .slice(0, MAX_LINKS)
    .map((link) => ({
      type: "link" as const,
      url: sanitizeHtml(link.href, { allowedTags: [] }),
      title: sanitizeHtml(link.text || "No title", { allowedTags: [] }),
    }));
};
