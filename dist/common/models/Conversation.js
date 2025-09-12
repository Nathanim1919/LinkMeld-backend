"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const conversationSchema = new mongoose_1.Schema({
    captureId: { type: String, required: true },
    messages: [
        {
            role: { type: String, required: true },
            content: { type: String, required: true },
            timestamp: { type: Date, default: Date.now },
        },
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
conversationSchema.pre("save", function (next) {
    this.updatedAt = new Date();
    next();
});
conversationSchema.index({ captureId: 1 });
const Conversation = (0, mongoose_1.model)("Conversation", conversationSchema);
exports.default = Conversation;
//# sourceMappingURL=Conversation.js.map