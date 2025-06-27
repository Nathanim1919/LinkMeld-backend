import { Router } from "express";
import {
  getAllDistinctSiteName,
  getCapturesWithSiteName,
  getCapturesWithSpecificSiteName
} from "../controllers/sourceController";

const sourceRouter = Router();

// Route to get all distinct site names
sourceRouter.get("/", getAllDistinctSiteName);
// Route to get captures with a specific site name
sourceRouter.get("/captures-by-site-name", getCapturesWithSiteName);
sourceRouter.get("/:siteName/captures", getCapturesWithSpecificSiteName);

export default sourceRouter;
