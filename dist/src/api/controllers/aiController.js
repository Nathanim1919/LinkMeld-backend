"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIController = void 0;
const Capture_1 = require("../../common/models/Capture");
const logger_1 = require("../../common/utils/logger");
const responseHandlers_1 = require("../../common/utils/responseHandlers");
const aiService_1 = require("../../ai/services/aiService");
const user_service_1 = require("../services/user.service");
const SERVICE_NAME = "AIController";
const REQUEST_TIMEOUT_MS = 60000;
class AIController {
    static async generateSummary(req, res) {
        var _a, _b;
        try {
            const { captureId } = req.body;
            const { user } = req;
            if (!captureId) {
                (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 400,
                    message: "Capture ID is required",
                    errorCode: "MISSING_CAPTURE_ID",
                });
                return;
            }
            logger_1.logger.info(`${SERVICE_NAME}:generateSummary`, { captureId });
            const capture = await Capture_1.Capture.findById(captureId);
            if (!capture) {
                (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 404,
                    message: "Capture not found",
                    errorCode: "CAPTURE_NOT_FOUND",
                });
                return;
            }
            const result = await (0, aiService_1.processContent)(capture.content.clean || "", user.id, capture.ai.summary || "");
            if (result.success && result.data) {
                capture.ai.summary = result.data.summary || "";
                await capture.save();
                logger_1.logger.info(`${SERVICE_NAME}:generateSummary:success`, {
                    captureId,
                    summaryLength: (_a = result.data.summary) === null || _a === void 0 ? void 0 : _a.length,
                });
            }
            else {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 500,
                    message: "Failed to generate summary",
                    error: result.error,
                    errorCode: "SUMMARY_GENERATION_FAILED",
                });
            }
            (0, responseHandlers_1.SuccessResponse)({
                res,
                statusCode: 200,
                data: {
                    summary: (_b = result === null || result === void 0 ? void 0 : result.data) === null || _b === void 0 ? void 0 : _b.summary,
                    captureId,
                },
                message: "AI summary generated successfully",
            });
        }
        catch (error) {
            logger_1.logger.error(`${SERVICE_NAME}:generateSummary:error`, error);
            (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 500,
                message: "Failed to generate AI summary",
                error: error instanceof Error ? error.message : "Unknown error",
                errorCode: "AI_SUMMARY_FAILED",
            });
        }
    }
    static async chat(req, res) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort("Request timeout"), REQUEST_TIMEOUT_MS);
        const { user } = req;
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("Cache-Control", "no-cache");
        res.flushHeaders();
        try {
            const { isValid, error } = (0, aiService_1.validateRequest)(req);
            if (!isValid) {
                res.write(`data: ${JSON.stringify({ error: error || "Invalid request", code: "INVALID_REQUEST" })}\n\n`);
                res.end();
                return;
            }
            const { captureId, messages, model } = req.body;
            logger_1.logger.info(`${SERVICE_NAME}:converse:stream:start`, {
                captureId,
                model,
            });
            const documentSummary = await Capture_1.Capture.findById(captureId)
                .select("ai.summary")
                .lean()
                .exec();
            const apiKey = await user_service_1.UserService.getGeminiApiKey(user.id);
            if (!apiKey) {
                res.write(`data: ${JSON.stringify({ error: "API key is required", code: "API_KEY_REQUIRED" })}\n\n`);
                res.end();
                return;
            }
            logger_1.logger.info(`${SERVICE_NAME}:converse:stream:start`, {
                captureId,
                model,
            });
            const stream = (0, aiService_1.processConversationStream)(user, apiKey, (documentSummary === null || documentSummary === void 0 ? void 0 : documentSummary.ai.summary) || "", captureId, messages, model, controller.signal);
            for await (const chunk of stream) {
                res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
            }
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        }
        catch (error) {
            const err = error;
            logger_1.logger.error(`${SERVICE_NAME}:converse:stream:error`, {
                name: err.name,
                message: err.message,
                stack: err.stack,
            });
            const errorCode = err.name === "AbortError"
                ? "REQUEST_TIMEOUT"
                : "AI_CONVERSATION_FAILED";
            const errorMessage = err.name === "AbortError"
                ? "Request timed out"
                : "AI conversation failed";
            res.write(`data: ${JSON.stringify({
                error: errorMessage,
                code: errorCode,
                details: err.message,
            })}\n\n`);
        }
        finally {
            clearTimeout(timeout);
            res.end();
        }
    }
}
exports.AIController = AIController;
//# sourceMappingURL=aiController.js.map