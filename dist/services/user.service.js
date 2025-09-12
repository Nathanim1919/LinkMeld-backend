"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const UserProfile_1 = __importDefault(require("../common/models/UserProfile"));
class UserService {
    static async getGeminiApiKey(userId) {
        var _a, _b;
        const profile = await UserProfile_1.default.findOne({ userId }, `externalServices.gemini.apiKey`);
        if (!((_b = (_a = profile === null || profile === void 0 ? void 0 : profile.externalServices) === null || _a === void 0 ? void 0 : _a.gemini) === null || _b === void 0 ? void 0 : _b.apiKey)) {
            throw new Error("Gemini API key not found for user");
        }
        return profile.getGeminiKey();
    }
}
exports.UserService = UserService;
//# sourceMappingURL=user.service.js.map