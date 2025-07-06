import { Router } from "express";
import { authentication } from "../middleware/authMiddleware";
import { AIController } from "../controllers/aiController";

const router = Router();

// Apply authentication middleware to all routes in this router
router.use(authentication);

// Route to converse with AI
router.post("/converse", AIController.chat);
router.post("/summary", AIController.generateSummary);

// Export the router
export default router;
