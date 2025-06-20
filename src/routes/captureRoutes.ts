import express from "express";
import {
  saveCapture,
  getCaptures,
  bookmarkOrUnbookmarkCapture,
  getBookmarkedCaptures
} from "../controllers/captureController";

const router = express.Router();

router.post("/save", saveCapture);
router.get("/", getCaptures);
router.get("/bookmarked", getBookmarkedCaptures);
router.post("/:captureId/bookmark", bookmarkOrUnbookmarkCapture); // Route to bookmark or unbookmark a capture

export default router;
