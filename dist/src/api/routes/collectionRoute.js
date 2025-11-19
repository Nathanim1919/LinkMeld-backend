"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const collectionController_1 = __importDefault(require("../controllers/collectionController"));
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authentication);
router.post("/", collectionController_1.default.createCollection);
router.get("/", collectionController_1.default.getCollections);
router.get("/:id", collectionController_1.default.getCollectionById);
router.post("/:id/captures", collectionController_1.default.addCaptureToCollection);
router.delete("/captures", collectionController_1.default.removeCaptureFromCollection);
router.get("/:id/captures", collectionController_1.default.getCollectionCaptures);
router.put("/:id", collectionController_1.default.updateCollection);
router.delete("/:id", collectionController_1.default.deleteCollection);
exports.default = router;
//# sourceMappingURL=collectionRoute.js.map