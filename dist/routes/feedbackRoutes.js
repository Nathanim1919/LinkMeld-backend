"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const feedbackController_1 = require("../controllers/feedbackController");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = express_1.default.Router();
router.post("/", (0, rateLimiter_1.rateLimiter)("strict"), feedbackController_1.submitFeedback);
router.get("/", feedbackController_1.getFeedback);
router.post("/:feedbackId/display", feedbackController_1.setFeedbackDisplayToTrue);
exports.default = router;
//# sourceMappingURL=feedbackRoutes.js.map