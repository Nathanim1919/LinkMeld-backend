import { Router } from "express";
import {
  createFolder,
  getFolders,
  getFolderById,
  appendCaptureToFolder
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

export default router;