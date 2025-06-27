import { Router } from "express";

import { resetAllData } from "../controllers/userControler";


const router = Router();


// Route to reset all user data
router.post("/reset", resetAllData);


export default router;