import express from "express";
import {
  saveCapture,
  getCaptures,
  bookmarkOrUnbookmarkCapture,
} from "../controllers/captureController";

const router = express.Router();

router.post("/save", saveCapture);
router.get("/", getCaptures);
router.post("/:captureId/bookmark", bookmarkOrUnbookmarkCapture); // Route to bookmark or unbookmark a capture

export default router;
