"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorResponse = exports.SuccessResponse = void 0;
const logger_1 = require("./logger");
const config_1 = require("../config/config");
const SuccessResponse = ({ res, statusCode = 200, data = null, message = "Success", metadata = {}, }) => {
    logger_1.logger.info(`SuccessResponse: ${message}`, { statusCode, metadata });
    res.status(statusCode).json({
        success: true,
        message,
        data,
        ...metadata,
    });
};
exports.SuccessResponse = SuccessResponse;
const ErrorResponse = ({ res, statusCode = 500, message = "Internal Server Error", error = null, errorCode = null, }) => {
    logger_1.logger.error(`ErrorResponse: ${message}`, {
        statusCode,
        errorCode,
        error: error instanceof Error ? error.message : error
    });
    const errorResponse = {
        success: false,
        message,
        ...(config_1.config.env === "development" && { error: (error === null || error === void 0 ? void 0 : error.message) || error }),
        ...(errorCode && { errorCode }),
    };
    res.status(statusCode).json(errorResponse);
};
exports.ErrorResponse = ErrorResponse;
//# sourceMappingURL=responseHandlers.js.map