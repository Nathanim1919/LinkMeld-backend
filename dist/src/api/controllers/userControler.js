"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserProfileController = void 0;
const Capture_1 = require("../../common/models/Capture");
const Collection_1 = __importDefault(require("../../common/models/Collection"));
const UserProfile_1 = __importDefault(require("../../common/models/UserProfile"));
const logger_1 = require("../../common/utils/logger");
const responseHandlers_1 = require("../../common/utils/responseHandlers");
const validators_1 = require("../../common/utils/validators");
const SERVICE_NAME = "UserProfileService";
const GEMINI_SERVICE = "gemini";
class UserProfileController {
    static async resetAllData(req, res) {
        try {
            const user = req.user;
            if (!(user === null || user === void 0 ? void 0 : user.id)) {
                (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 401,
                    message: "Unauthorized: Invalid user credentials",
                });
                return;
            }
            logger_1.logger.info(`${SERVICE_NAME}:resetAllData`, { userId: user.id });
            await Promise.all([
                UserProfileController.clearUserCaptures(user.id),
                UserProfileController.clearUserCollections(user.id),
            ]);
            (0, responseHandlers_1.SuccessResponse)({
                res,
                statusCode: 200,
                data: {
                    message: "All user data has been successfully reset",
                    resetItems: ["captures", "collections"],
                },
            });
        }
        catch (error) {
            logger_1.logger.error(`${SERVICE_NAME}:resetAllData:error`, error);
            (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 500,
                message: "Failed to reset user data",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
    static async clearUserCaptures(userId) {
        try {
            const result = await Capture_1.Capture.deleteMany({ owner: userId });
            logger_1.logger.info(`${SERVICE_NAME}:clearUserCaptures`, {
                userId,
                deletedCount: result.deletedCount,
            });
        }
        catch (error) {
            logger_1.logger.error(`${SERVICE_NAME}:clearUserCaptures:error`, {
                userId,
                error,
            });
            throw new Error("Failed to clear user captures");
        }
    }
    static async clearUserCollections(userId) {
        try {
            const result = await Collection_1.default.deleteMany({ user: userId });
            logger_1.logger.info(`${SERVICE_NAME}:clearUserCollections`, {
                userId,
                deletedCount: result.deletedCount,
            });
        }
        catch (error) {
            logger_1.logger.error(`${SERVICE_NAME}:clearUserCollections:error`, {
                userId,
                error,
            });
            throw new Error("Failed to clear user collections");
        }
    }
    static async upsertGeminiApiKey(req, res) {
        try {
            const user = req.user;
            const { geminiApiKey, apiKey: legacyApiKey } = req.body;
            const providedKey = geminiApiKey || legacyApiKey;
            if (!(user === null || user === void 0 ? void 0 : user.id)) {
                (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 401,
                    message: "Unauthorized: Invalid user credentials",
                });
                return;
            }
            if (!providedKey) {
                (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 400,
                    message: "Gemini API key is required",
                });
                return;
            }
            if (!validators_1.validateApiKey.gemini(providedKey)) {
                (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 400,
                    message: "Invalid Gemini API key format",
                });
                return;
            }
            logger_1.logger.info(`${SERVICE_NAME}:upsertGeminiApiKey`, {
                userId: user.id,
                keyPresent: !!providedKey,
                legacyFieldUsed: !!legacyApiKey && !geminiApiKey,
            });
            await UserProfile_1.default.findOneAndUpdate({ userId: user.id }, {
                $set: { [`externalServices.${GEMINI_SERVICE}.apiKey`]: providedKey },
            }, { upsert: true, new: true });
            (0, responseHandlers_1.SuccessResponse)({
                res,
                statusCode: 200,
                message: "Gemini API key has been successfully upserted",
            });
        }
        catch (error) {
            logger_1.logger.error(`${SERVICE_NAME}:upsertGeminiApiKey:error`, error);
            (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 500,
                message: "Failed to upsert Gemini API key",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
    static async getUserProfile(req, res) {
        var _a, _b, _c;
        try {
            const user = req.user;
            if (!(user === null || user === void 0 ? void 0 : user.id)) {
                (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 401,
                    message: "Unauthorized: Invalid user credentials",
                });
                return;
            }
            const profile = await UserProfile_1.default.findOne({ userId: user.id })
                .select("+externalServices.gemini.apiKey")
                .lean()
                .exec();
            if (!profile) {
                (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 404,
                    message: "User profile not found",
                });
                return;
            }
            const rawKey = (_b = (_a = profile === null || profile === void 0 ? void 0 : profile.externalServices) === null || _a === void 0 ? void 0 : _a.gemini) === null || _b === void 0 ? void 0 : _b.apiKey;
            const hasApiKey = !!rawKey;
            const maskedKey = hasApiKey
                ? `${rawKey.slice(0, 4)}...${rawKey.slice(-4)}`
                : undefined;
            if (profile.externalServices && profile.externalServices.gemini) {
                delete profile.externalServices.gemini.apiKey;
            }
            (0, responseHandlers_1.SuccessResponse)({
                res,
                statusCode: 200,
                data: {
                    ...profile,
                    externalServices: {
                        ...profile.externalServices,
                        gemini: {
                            ...(((_c = profile.externalServices) === null || _c === void 0 ? void 0 : _c.gemini) || {}),
                            hasApiKey,
                            maskedKey,
                        },
                    },
                },
            });
        }
        catch (error) {
            logger_1.logger.error(`${SERVICE_NAME}:getUserProfile:error`, error);
            (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 500,
                message: "Failed to fetch user profile",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
}
exports.UserProfileController = UserProfileController;
//# sourceMappingURL=userControler.js.map