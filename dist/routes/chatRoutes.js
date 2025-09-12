"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const aiController_1 = require("../controllers/aiController");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authentication);
router.post("/converse", aiController_1.AIController.chat);
router.post("/summary", (0, rateLimiter_1.rateLimiter)("strict"), aiController_1.AIController.generateSummary);
exports.default = router;
//# sourceMappingURL=chatRoutes.js.map