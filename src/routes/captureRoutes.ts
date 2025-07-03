import express from "express";
import {
  saveCapture,
  getCaptures,
  bookmarkOrUnbookmarkCapture,
  getBookmarkedCaptures,
  searchCaptures,
  getCaptureById
} from "../controllers/captureController";
import { authentication } from "../middleware/authMiddleware";

const router = express.Router();

router.use(authentication); // Apply authentication middleware to all routes in this router

router.get("/", getCaptures);
router.post("/save", saveCapture);
router.get("/search", searchCaptures); // Route to search captures
router.get("/bookmarked", getBookmarkedCaptures);
router.get("/:captureId", getCaptureById);
router.post("/:captureId/bookmark", bookmarkOrUnbookmarkCapture); // Route to bookmark or unbookmark a capture

export default router;
