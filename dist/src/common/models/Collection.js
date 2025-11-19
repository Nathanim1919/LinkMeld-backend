"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const CollectionSchema = new mongoose_1.default.Schema({
    user: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    captures: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "Capture" }],
    parentCollection: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Collection",
        default: null,
    },
}, {
    timestamps: true,
});
const Collection = mongoose_1.default.model("Collection", CollectionSchema);
exports.default = Collection;
//# sourceMappingURL=Collection.js.map