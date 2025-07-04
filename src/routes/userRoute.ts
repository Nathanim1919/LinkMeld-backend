import { Router } from "express";
import { UserProfileController } from "../controllers/userControler";
import { authentication } from "../middleware/authMiddleware";
import { rateLimiter } from "../middleware/rateLimiter";

const router = Router();

// Apply authentication middleware to all routes
router.use(authentication);

// Apply rate limiting to sensitive operations
router.use("/reset", rateLimiter("strict"));
router.use("/setGeminiApiKey", rateLimiter("strict"));

// Route definitions
router.post("/reset", UserProfileController.resetAllData);
router.post("/setGeminiApiKey", UserProfileController.upsertGeminiApiKey);
router.get("/profile", UserProfileController.getUserProfile);

export const userProfileRoutes = router;
