"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const FeedbackSchema = new mongoose_1.default.Schema({
    feedback: {
        type: String,
        required: true,
        trim: true,
    },
    display: {
        type: Boolean,
        default: false
    },
    name: {
        type: String,
        trim: true,
        default: "Anonymous",
    },
    profession: {
        type: String,
        trim: true,
        default: "Unknown",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});
const Feedback = mongoose_1.default.model("Feedback", FeedbackSchema);
exports.default = Feedback;
//# sourceMappingURL=Feedback.js.map