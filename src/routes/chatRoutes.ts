import { Router } from "express";
import { authentication } from "../middleware/authMiddleware";
import {
  converseWithAI,
  generateAiSummary,
} from "../controllers/aiController";

const router = Router();

// Apply authentication middleware to all routes in this router
router.use(authentication);

// Route to converse with AI
router.post("/converse", converseWithAI);
router.post("/summary", generateAiSummary);

// Export the router
export default router;
