"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const sourceController_1 = require("../controllers/sourceController");
const router = express_1.default.Router();
router.use(authMiddleware_1.authentication);
router.get("/", sourceController_1.getAllDistinctSites);
router.get("/search", sourceController_1.getCapturesBySiteQuery);
router.get("/:siteName/captures", sourceController_1.getCapturesBySiteParam);
exports.default = router;
//# sourceMappingURL=sourceRoute.js.map