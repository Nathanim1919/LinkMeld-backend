import { Router } from "express";

import { resetAllData, addGeminiApiKey, createUserProfile } from "../controllers/userControler";
import { authentication } from "../middleware/authMiddleware";

const router = Router();

router.use(authentication); // Apply authentication middleware to all routes in this router

// Route to reset all user data
router.post("/reset", resetAllData);
router.post("/setGeminiApiKey", addGeminiApiKey);
router.post("/createUserProfile", createUserProfile);

export default router;
