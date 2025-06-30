import { Router } from "express";
import {converseWithAI} from "../ai/services/aiService";
import { authentication } from "../middleware/authMiddleware";

const router = Router();

// Apply authentication middleware to all routes in this router
router.use(authentication);

// Route to converse with AI
router.post("/converse", converseWithAI);


// Export the router
export default router;


