import { Router } from "express";
import {
  getAllDistinctSiteName,
  getCapturesWithSiteName,
} from "../controllers/sourceController";

const sourceRouter = Router();

// Route to get all distinct site names
sourceRouter.get("/distinct-site-names", getAllDistinctSiteName);
// Route to get captures with a specific site name
sourceRouter.get("/captures-by-site-name", getCapturesWithSiteName);

export default sourceRouter;
