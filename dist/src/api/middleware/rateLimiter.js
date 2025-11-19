"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.strictLimiter = exports.standardLimiter = exports.rateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const responseHandlers_1 = require("../../common/utils/responseHandlers");
const logger_1 = require("../../common/utils/logger");
const commonOptions = {
    windowMs: 15 * 60 * 1000,
    standard: {
        max: 100,
        message: "Too many requests from this IP, please try again later",
    },
    strict: {
        max: 5,
        message: "Too many sensitive operations from this IP, please try again later",
    },
};
const handler = (req, res, options) => {
    logger_1.logger.warn("Rate limit exceeded", {
        ip: req.ip,
        method: req.method,
        path: req.path,
    });
    (0, responseHandlers_1.ErrorResponse)({
        res,
        statusCode: 429,
        message: options.message,
        errorCode: "RATE_LIMIT_EXCEEDED",
    });
};
const rateLimiter = (type) => {
    return (0, express_rate_limit_1.default)({
        windowMs: commonOptions.windowMs,
        max: commonOptions[type].max,
        message: commonOptions[type].message,
        handler,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => {
            var _a;
            return ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || req.ip;
        },
        skip: (req) => {
            var _a;
            return ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === "admin";
        },
    });
};
exports.rateLimiter = rateLimiter;
exports.standardLimiter = (0, exports.rateLimiter)("standard");
exports.strictLimiter = (0, exports.rateLimiter)("strict");
//# sourceMappingURL=rateLimiter.js.map