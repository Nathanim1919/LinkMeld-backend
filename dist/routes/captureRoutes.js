"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const rateLimiter_1 = require("../middleware/rateLimiter");
const captureController_1 = require("../controllers/captureController");
const router = express_1.default.Router();
router.use(authMiddleware_1.authentication);
router.get("/", captureController_1.getCaptures);
router.post("/save", (0, rateLimiter_1.rateLimiter)("strict"), captureController_1.saveCapture);
router.get("/search", captureController_1.searchCaptures);
router.get("/bookmarked", captureController_1.getBookmarkedCaptures);
router.get("/:captureId", captureController_1.getCaptureById);
router.delete("/:captureId", captureController_1.deleteCapture);
router.patch("/:captureId/bookmark", (0, rateLimiter_1.rateLimiter)("standard"), captureController_1.toggleBookmark);
router.post("/:captureId/reprocess", (0, rateLimiter_1.rateLimiter)("strict"), captureController_1.reProcessCapture);
exports.default = router;
//# sourceMappingURL=captureRoutes.js.map