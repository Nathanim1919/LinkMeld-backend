import { Request, Response } from "express";
import Feedback from "../models/Feedback";
import { ErrorResponse, SuccessResponse } from "../utils/responseHandlers";

export const submitFeedback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { feedback, name } = req.body;

    // Validate input
    if (!feedback || typeof feedback !== "string") {
      return ErrorResponse({
        res,
        statusCode: 400,
        message: "Feedback is required and must be a string.",
      });
    }

    // Create new feedback entry
    const newFeedback = new Feedback({
      feedback: feedback.trim(),
      name: name ? name.trim() : "Anonymous",
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
