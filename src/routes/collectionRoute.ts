import { Router } from "express";
import {
  createCollection,
  getFolders,
  getFolderById,
  appendCaptureToFolder,
  getCapturesWithSpecificFolder
} from "../controllers/collectionController";

const router = Router();

// Route to create a new folder
router.post("/", createCollection);
// Route to get all folders
router.get("/", getFolders);
// Route to get a folder by ID
router.get("/:id", getFolderById);
// Route to append a capture to a folder
router.post("/:id/capture", appendCaptureToFolder);
router.get("/:id/captures", getCapturesWithSpecificFolder); // Assuming this is to get captures in a folder

export default router;