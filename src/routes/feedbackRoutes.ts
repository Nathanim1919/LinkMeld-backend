import express from "express";
import {
  getFeedback,
  submitFeedback,
} from "../controllers/feedbackController";
import { rateLimiter } from "../middleware/rateLimiter";

const router = express.Router();

/**
 * @route   POST /api/feedback
 * @desc    Submit user feedback
 * @access  Public
 */
router.post("/", rateLimiter("strict"), submitFeedback);
/**
 * @route   GET /api/feedback
 * @desc    Get all user feedback
 * @access  Public
 */
router.get("/", getFeedback);

export default router;
