import { Request, Response } from "express";
import { Capture } from "../models/Capture";
import { logger } from "../utils/logger";
import { ErrorResponse, SuccessResponse } from "../utils/responseHandlers";
import {
  ConversationRequest,
  processContent,
  processConversation,
  validateRequest,
} from "../ai/services/aiService";
import { UserService } from "../services/user.service";

// Constants
const SERVICE_NAME = "AIController";
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds

/**
 * @class AIController
 * @description Handles all AI-related operations including summarization and conversations
 */
export class AIController {
  /**
   * @method generateSummary
   * @description Generates AI summary for a capture
   */
  static async generateSummary(req: Request, res: Response): Promise<void> {
    try {
      const { captureId } = req.body;
      const { user } = req;

      // Validate input
      if (!captureId) {
        ErrorResponse({
          res,
          statusCode: 400,
          message: "Capture ID is required",
          errorCode: "MISSING_CAPTURE_ID",
        });
        return;
      }

      logger.info(`${SERVICE_NAME}:generateSummary`, { captureId });

      // Find the capture by ID
      const capture = await Capture.findById(captureId);
      if (!capture) {
        ErrorResponse({
          res,
          statusCode: 404,
          message: "Capture not found",
          errorCode: "CAPTURE_NOT_FOUND",
        });
        return;
      }

      // Process content and generate summary
      const apiKey = await UserService.getGeminiApiKey(user.id);
      if (!apiKey) {
        ErrorResponse({
          res,
          statusCode: 403,
          message: "API key is required for AI operations",
          errorCode: "API_KEY_REQUIRED",
        });
        return;
      }
      const result = await processContent(capture.content.clean, apiKey);

      if (result.success && result.data) {
        capture.ai.summary = result.data.summary || "";
        await capture.save();

        logger.info(`${SERVICE_NAME}:generateSummary:success`, {
          captureId,
          summaryLength: result.data.summary?.length,
        });
      }

      SuccessResponse({
        res,
        statusCode: 200,
        data: {
          summary: result?.data?.summary,
          captureId,
        },
        message: "AI summary generated successfully",
      });
    } catch (error) {
      logger.error(`${SERVICE_NAME}:generateSummary:error`, error);
      ErrorResponse({
        res,
        statusCode: 500,
        message: "Failed to generate AI summary",
        error: error instanceof Error ? error.message : "Unknown error",
        errorCode: "AI_SUMMARY_FAILED",
      });
    }
  }

  /**
   * @method converse
   * @description Handles AI conversation with context from a capture
   */
  static async chat(req: Request, res: Response): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const { user } = req;

    try {
      // Validate request
      const { isValid, error } = validateRequest(req);
      if (!isValid) {
        ErrorResponse({
          res,
          statusCode: 400,
          message: error || "Invalid request",
          errorCode: "INVALID_REQUEST",
        });
        return;
      }

      const { captureId, messages, model } = req.body as ConversationRequest;
      logger.info(`${SERVICE_NAME}:converse`, { captureId, model });

      // Fetch content
      const content = await Capture.findById(captureId)
        .select("content")
        .lean()
        .exec();

      if (!content) {
        ErrorResponse({
          res,
          statusCode: 404,
          message: "Content not found",
          errorCode: "CONTENT_NOT_FOUND",
        });
        return;
      }

      const apiKey = await UserService.getGeminiApiKey(user.id);

      // Process conversation
      const { message, tokensUsed, modelUsed } = await processConversation(
        user,
        apiKey,
        content.content.clean,
        messages,
        model,
        controller.signal
      );

      logger.info(`${SERVICE_NAME}:converse:success`, {
        captureId,
        tokensUsed,
        modelUsed,
      });

      SuccessResponse({
        res,
        statusCode: 200,
        data: {
          response: message,
          modelUsed,
          tokensUsed,
          captureId,
          timestamp: new Date().toISOString(),
        },
        message: "AI conversation completed successfully",
      });
    } catch (error) {
      if (error.name === "AbortError") {
        logger.warn(`${SERVICE_NAME}:converse:timeout`);
        ErrorResponse({
          res,
          statusCode: 504,
          message: "Request timeout",
          errorCode: "REQUEST_TIMEOUT",
        });
      } else {
        logger.error(`${SERVICE_NAME}:converse:error`, error);
        ErrorResponse({
          res,
          statusCode: 500,
          message: "AI conversation failed",
          error: error instanceof Error ? error.message : "Unknown error",
          errorCode: "AI_CONVERSATION_FAILED",
          ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
        });
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
