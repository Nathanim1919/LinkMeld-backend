"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const crypto_1 = require("../security/crypto");
const UserProfileSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, unique: true },
    externalServices: {
        gemini: {
            apiKey: {
                type: String,
                set: (value) => (0, crypto_1.encrypt)(value),
                get: (value) => (0, crypto_1.decrypt)(value),
                select: false,
            },
        },
    },
}, {
    timestamps: true,
});
UserProfileSchema.methods.getGeminiKey = function () {
    var _a, _b;
    return (_b = (_a = this.externalServices) === null || _a === void 0 ? void 0 : _a.gemini) === null || _b === void 0 ? void 0 : _b.apiKey;
};
UserProfileSchema.methods.setGeminiKey = function (apiKey) {
    this.externalServices = {
        ...this.externalServices,
        gemini: { apiKey },
    };
};
const UserProfile = mongoose_1.default.model("UserProfile", UserProfileSchema);
exports.default = UserProfile;
//# sourceMappingURL=UserProfile.js.map