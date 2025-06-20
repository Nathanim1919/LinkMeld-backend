import { Request, Response } from "express";
import Capture, { ICapture } from "../models/Capture";
import sanitizeHtml from "sanitize-html";

export const saveCapture = async (
  req: Request,
  res: Response
): Promise<void> => {
  console.log("[LinkMeld] Saving capture:", {
    url: req.body.url,
    timestamp: req.body.timestamp,
  });
  try {
    const { url, mainText, metadata, documents, metrics, timestamp } = req.body;

    // Validate required fields
    if (!url || !timestamp) {
      res
        .status(400)
        .json({ message: "Missing required fields: url, timestamp" });
      return;
    }

    // Detect PDF
    const isPdf = url.match(/\.pdf($|\?)/i);

    // Sanitize inputs
    const cleanMainText = mainText
      ? sanitizeHtml(mainText, { allowedTags: [], allowedAttributes: {} })
      : "";
    const cleanMetadata = {
      title: sanitizeHtml(metadata?.title || "Untitled", { allowedTags: [] }),
      description: sanitizeHtml(metadata?.description || "", {
        allowedTags: [],
      }),
      url: sanitizeHtml(metadata?.url || url, { allowedTags: [] }),
      favicon: sanitizeHtml(metadata?.favicon || "", { allowedTags: [] }),
      siteName: sanitizeHtml(metadata?.siteName || "", { allowedTags: [] }),
      publishedTime: sanitizeHtml(metadata?.publishedTime || "", {
        allowedTags: [],
      }),
      author: sanitizeHtml(metadata?.author || "", { allowedTags: [] }),
      keywords: sanitizeHtml(metadata?.keywords || "", { allowedTags: [] }),
      viewport: sanitizeHtml(metadata?.viewport || "", { allowedTags: [] }),
      extractionMethod: sanitizeHtml(metadata?.extractionMethod || "unknown", {
        allowedTags: [],
      }),
      isPdf: !!isPdf,
    };

    // Ensure documents is an array
    const cleanDocuments = Array.isArray(documents)
      ? documents.map((doc) => ({
          url: sanitizeHtml(doc.url, { allowedTags: [] }),
          type: sanitizeHtml(doc.type, { allowedTags: [] }),
        }))
      : [];

    // Prepare capture data
    const captureData: Partial<ICapture> = {
      url,
      timestamp: new Date(timestamp),
      metadata: cleanMetadata,
      mainText: cleanMainText,
      documents: cleanDocuments,
      metrics: {
        contentExtraction: metrics?.contentExtraction || 0,
        documentExtraction: metrics?.documentExtraction || 0,
        metadataExtraction: metrics?.metadataExtraction || 0,
        totalTime: metrics?.totalTime || 0,
        textLength: metrics?.textLength || 0,
        documentCount: metrics?.documentCount || 0,
      },
    };

    // Save to MongoDB
    const capture = new Capture(captureData);
    await capture.save();

    console.log("[LinkMeld] Capture saved:", { id: capture._id, url });
    res
      .status(201)
      .json({ message: "Capture saved successfully", captureId: capture._id });
  } catch (error) {
    console.error("[LinkMeld] Error saving capture:", error);
    res
      .status(500)
      .json({ message: "Error saving capture", error: error.message });
  }
};

export const getCaptures = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const captures = await Capture.find()
      .sort({ timestamp: -1 })
      .populate("folder", "name") // Populate folder name
      .exec();
    res.status(200).json(captures);
  } catch (error) {
    console.error("[LinkMeld] Error fetching captures:", error);
    res
      .status(500)
      .json({ message: "Error fetching captures", error: error.message });
  }
};

export const bookmarkOrUnbookmarkCapture = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { captureId } = req.params;

  if (!captureId) {
    res.status(400).json({
      message: "Invalid request. Please provide captureId and isBookmarked.",
    });
    return;
  }

  try {
    const capture = await Capture.findById(captureId);
    if (!capture) {
      res.status(404).json({ message: "Capture not found" });
      return;
    }

    capture.bookmarked = !capture.bookmarked;
    await capture.save();

    res.status(200).json({
      message: `Capture ${
        capture.bookmarked ? "bookmarked" : "unbookmarked"
      } successfully`,
      captureId: capture._id,
    });
  } catch (error) {
    console.error("[LinkMeld] Error bookmarking/unbookmarking capture:", error);
    res.status(500).json({
      message: "Error bookmarking/unbookmarking capture",
      error: error.message,
    });
  }
};

export const getBookmarkedCaptures = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const captures = await Capture.find({ bookmarked: true })
      .sort({ timestamp: -1 })
      .populate("folder", "name") // Populate folder name
      .exec();
    res.status(200).json(captures);
  } catch (error) {
    console.error("[LinkMeld] Error fetching bookmarked captures:", error);
    res
      .status(500)
      .json({
        message: "Error fetching bookmarked captures",
        error: error.message,
      });
  }
};
