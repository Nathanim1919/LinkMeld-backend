"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userProfileRoutes = void 0;
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const rateLimiter_1 = require("../middleware/rateLimiter");
const userControler_1 = require("../controllers/userControler");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authentication);
router.post("/reset", (0, rateLimiter_1.rateLimiter)("strict"), userControler_1.UserProfileController.resetAllData);
router.post("/setGeminiApiKey", (0, rateLimiter_1.rateLimiter)("strict"), userControler_1.UserProfileController.upsertGeminiApiKey);
router.get("/profile", userControler_1.UserProfileController.getUserProfile);
exports.userProfileRoutes = router;
//# sourceMappingURL=userRoute.js.map