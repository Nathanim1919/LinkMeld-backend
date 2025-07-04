import { Request, Response } from "express";
import {
  ConversationRequest,
  processContent,
  processConversation,
  validateRequest,
} from "../ai/services/aiService";
import { Capture } from "../models/Capture";

export const generateAiSummary = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { captureId } = req.body;

    // Validate input
    if (!captureId) {
      res.status(400).json({ error: "Capture ID required." });
      return;
    }

    // Find the capture by ID
    const capture = await Capture.findById(captureId);
    if (!capture) {
      res.status(404).json({ error: "Capture not found." });
      return;
    }

    const result = await processContent(capture.content.clean);

    if (result.success && result.data) {
      capture.ai.summary = result.data.summary || "";
      // capture.ai.embeddings = result.data.embeddings || [];
    }

    await capture.save();

    res.status(200).json({
      message: "Summary updated successfully.",
      summary: result?.data?.summary,
    });
  } catch (error) {
    console.error("Error updating summary:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

export const converseWithAI = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Validate request
  // console.log('Request Body:', req.body);
  const { isValid, error } = validateRequest(req);
  if (!isValid) {
    res.status(400).json({ success: false, error });
    return;
  }
  const { captureId, messages, model } = req.body as ConversationRequest;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    // In a real implementation, you would fetch the content associated with captureId
    const content = await Capture.findById(captureId)
      .select("content") // Assuming content is stored in the Capture model
      .lean()
      .exec();

    if (!content) {
      res.status(404).json({ success: false, error: "Content not found" });
      return;
    }

    // Process conversation
    const { message, tokensUsed, modelUsed } = await processConversation(
      content.content.clean,
      messages,
      model,
      controller.signal
    );

    // console.log(`Conversation processed for captureId and content of: ${content.content.raw}`);

    // In production, you might want to:
    // 1. Store the conversation in a database
    // 2. Update usage analytics
    // 3. Cache frequent queries
    // 4. Implement cost tracking per user/organization

    res.status(200).json({
      success: true,
      data: {
        response: message,
        modelUsed,
        tokensUsed,
        captureId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error.name === "AbortError") {
      res.status(504).json({ success: false, error: "Request timeout" });
    } else {
      console.error("Conversation error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  } finally {
    clearTimeout(timeout);
  }
};
