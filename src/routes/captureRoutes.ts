import express from "express";
import {
  saveCapture,
  getCaptures,
  bookmarkOrUnbookmarkCapture,
  getBookmarkedCaptures
} from "../controllers/captureController";
import { authentication } from "src/middleware/auth.middleware";

const router = express.Router();

router.use(authentication); // Apply authentication middleware to all routes in this router

router.post("/save", saveCapture);
router.get("/", getCaptures);
router.get("/bookmarked", getBookmarkedCaptures);
router.post("/:captureId/bookmark", bookmarkOrUnbookmarkCapture); // Route to bookmark or unbookmark a capture

export default router;
