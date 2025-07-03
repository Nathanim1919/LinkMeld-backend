import express from "express";
import {
  getAllDistinctSiteName,
  getCapturesWithSiteName,
  getCapturesWithSpecificSiteName
} from "../controllers/sourceController";

import { authentication } from "../middleware/authMiddleware";

const router = express.Router();

router.use(authentication);

// Route to get all distinct site names
router.get("/captures-by-site-name", getCapturesWithSiteName);
router.get("/", getAllDistinctSiteName);
// Route to get captures with a specific site name
router.get("/:siteName/captures", getCapturesWithSpecificSiteName);

export default router;
