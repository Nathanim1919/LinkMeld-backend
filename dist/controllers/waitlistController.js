"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinWaitlist = void 0;
const Waitlist_1 = __importDefault(require("../common/models/Waitlist"));
const responseHandlers_1 = require("../common/utils/responseHandlers");
const joinWaitlist = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || typeof email !== "string") {
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 400,
                message: "Please provide a valid email address.",
            });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 400,
                message: "Invalid email format. Please check and try again.",
            });
        }
        const existing = await Waitlist_1.default.findOne({ email });
        if (existing) {
            return (0, responseHandlers_1.SuccessResponse)({
                res,
                statusCode: 200,
                message: "You're already on the waitlist. We'll keep you posted!",
            });
        }
        const waitlistEntry = await Waitlist_1.default.create({ email });
        if (!waitlistEntry) {
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 500,
                message: "Something went wrong while joining the waitlist. Please try again later.",
            });
        }
        return (0, responseHandlers_1.SuccessResponse)({
            res,
            statusCode: 200,
            message: "You're on the waitlist! We'll let you know when Deepen is ready.",
        });
    }
    catch (error) {
        console.error("Join waitlist error:", error);
        return (0, responseHandlers_1.ErrorResponse)({
            res,
            statusCode: 500,
            message: "Unexpected error occurred. Please try again later.",
        });
    }
};
exports.joinWaitlist = joinWaitlist;
//# sourceMappingURL=waitlistController.js.map