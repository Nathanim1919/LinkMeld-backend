import { Router } from "express";
import {
  createFolder,
  getFolders,
  getFolderById,
  appendCaptureToFolder,
  getCapturesWithSpecificFolder
} from "../controllers/folderController";

const router = Router();

// Route to create a new folder
router.post("/", createFolder);
// Route to get all folders
router.get("/", getFolders);
// Route to get a folder by ID
router.get("/:id", getFolderById);
// Route to append a capture to a folder
router.post("/:id/capture", appendCaptureToFolder);
router.get("/:id/captures", getCapturesWithSpecificFolder); // Assuming this is to get captures in a folder

export default router;