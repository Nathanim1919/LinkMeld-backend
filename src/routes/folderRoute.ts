import { Router } from "express";
import {
  createFolder,
  getFolders,
  getFolderById
} from "../controllers/folderController";

const router = Router();

// Route to create a new folder
router.post("/", createFolder);
// Route to get all folders
router.get("/", getFolders);
// Route to get a folder by ID
router.get("/:id", getFolderById);

export default router;
