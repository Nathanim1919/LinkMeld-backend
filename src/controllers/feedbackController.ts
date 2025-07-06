import { Request, Response } from "express";
import Feedback from "../models/Feedback";
import { ErrorResponse, SuccessResponse } from "../utils/responseHandlers";

export const submitFeedback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { feedbackData } = req.body;
    console.log("[Feedback] Received data:", feedbackData);

    // Validate input
    if (!feedbackData.feedback || typeof feedbackData.feedback !== "string") {
      return ErrorResponse({
        res,
        statusCode: 400,
        message: "Feedback is required and must be a string.",
      });
    }

    // Create new feedback entry
    const newFeedback = new Feedback({
      feedback: feedbackData.feedback.trim(),
      name: feedbackData.name ? feedbackData.name.trim() : "Anonymous",
      profession: feedbackData.profession
        ? feedbackData.profession.trim()
        : "Unknown",
      createdAt: new Date(),
    });

    await newFeedback.save();

    return SuccessResponse({
      res,
      message: "Feedback submitted successfully.",
      data: newFeedback,
    });
  } catch (error) {
    console.error("[Feedback] Submission error:", error);
    return ErrorResponse({
      res,
      statusCode: 500,
      message: "Failed to submit feedback.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getFeedback = async (req: Request, res: Response) => {
  try {
    const feedbackList = await Feedback.find().sort({ createdAt: -1 });

    return SuccessResponse({
      res,
      message: "Feedback retrieved successfully.",
      data: feedbackList,
    });
  } catch (error) {
    console.error("[Feedback] Retrieval error:", error);
    return ErrorResponse({
      res,
      statusCode: 500,
      message: "Failed to retrieve feedback.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
