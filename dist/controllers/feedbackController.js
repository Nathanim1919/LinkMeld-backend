"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setFeedbackDisplayToTrue = exports.getFeedback = exports.submitFeedback = void 0;
const Feedback_1 = __importDefault(require("../common/models/Feedback"));
const responseHandlers_1 = require("../common/utils/responseHandlers");
const submitFeedback = async (req, res) => {
    try {
        const { feedbackData } = req.body;
        if (!feedbackData.feedback || typeof feedbackData.feedback !== "string") {
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 400,
                message: "Feedback is required and must be a string.",
            });
        }
        const newFeedback = new Feedback_1.default({
            feedback: feedbackData.feedback.trim(),
            name: feedbackData.name ? feedbackData.name.trim() : "Anonymous",
            profession: feedbackData.profession
                ? feedbackData.profession.trim()
                : "Unknown",
            createdAt: new Date(),
        });
        await newFeedback.save();
        return (0, responseHandlers_1.SuccessResponse)({
            res,
            message: "Feedback submitted successfully.",
            data: newFeedback,
        });
    }
    catch (error) {
        console.error("[Feedback] Submission error:", error);
        return (0, responseHandlers_1.ErrorResponse)({
            res,
            statusCode: 500,
            message: "Failed to submit feedback.",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.submitFeedback = submitFeedback;
const getFeedback = async (_, res) => {
    try {
        const feedbackList = await Feedback_1.default.find().sort({ createdAt: -1 });
        return (0, responseHandlers_1.SuccessResponse)({
            res,
            message: "Feedback retrieved successfully.",
            data: feedbackList,
        });
    }
    catch (error) {
        console.error("[Feedback] Retrieval error:", error);
        return (0, responseHandlers_1.ErrorResponse)({
            res,
            statusCode: 500,
            message: "Failed to retrieve feedback.",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.getFeedback = getFeedback;
const setFeedbackDisplayToTrue = async (req, res) => {
    try {
        const { feedbackId } = req.params;
        if (!feedbackId) {
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                message: "FeedbackId is Null",
                statusCode: 400,
            });
        }
        const feedback = await Feedback_1.default.findById(feedbackId);
        if (!feedback) {
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                message: "Feedback Not Found",
                statusCode: 401,
            });
        }
        feedback.display = true;
        await feedback.save();
        return (0, responseHandlers_1.SuccessResponse)({
            res,
            message: "Feedback display set to True",
            data: feedback,
        });
    }
    catch (error) {
        return (0, responseHandlers_1.ErrorResponse)({
            res,
            statusCode: 500,
            message: "Failed to retrieve feedback.",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.setFeedbackDisplayToTrue = setFeedbackDisplayToTrue;
//# sourceMappingURL=feedbackController.js.map