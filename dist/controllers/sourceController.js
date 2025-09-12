"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCapturesBySiteParam = exports.getCapturesBySiteQuery = exports.getAllDistinctSites = void 0;
const Capture_1 = require("../common/models/Capture");
const mongoose_1 = require("mongoose");
const responseHandlers_1 = require("../common/utils/responseHandlers");
const findCapturesBySite = async (userId, siteName) => {
    return await Capture_1.Capture.find({
        "metadata.siteName": siteName,
        owner: userId,
    })
        .sort({ timestamp: -1 })
        .populate("collection", "name")
        .exec();
};
const getAllDistinctSites = async (req, res) => {
    try {
        const userId = new mongoose_1.Types.ObjectId(req.user.id);
        const siteNames = await Capture_1.Capture.distinct("metadata.siteName", {
            owner: userId,
            "metadata.siteName": { $ne: "" }
        });
        if (!siteNames || siteNames.length === 0) {
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 404,
                message: "No distinct site names found for user",
            });
        }
        const siteNameCounts = await Capture_1.Capture.aggregate([
            { $match: { owner: userId } },
            {
                $group: {
                    _id: "$metadata.siteName",
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    siteName: "$_id",
                    count: 1,
                    _id: 0,
                },
            },
        ]);
        const siteNameMap = siteNameCounts.reduce((acc, { siteName, count }) => {
            acc[siteName] = count;
            return acc;
        }, {});
        return (0, responseHandlers_1.SuccessResponse)({
            res,
            message: "Distinct site names retrieved successfully",
            data: {
                siteNames,
                counts: siteNameMap,
            },
        });
    }
    catch (error) {
        console.error("[Capture] Distinct sites error:", error);
        return (0, responseHandlers_1.ErrorResponse)({
            res,
            statusCode: 500,
            message: "Failed to retrieve distinct site names",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.getAllDistinctSites = getAllDistinctSites;
const getCapturesBySiteQuery = async (req, res) => {
    try {
        const { siteName } = req.query;
        if (!siteName || typeof siteName !== "string") {
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 400,
                message: "Valid siteName query parameter is required",
            });
        }
        const userId = new mongoose_1.Types.ObjectId(req.user.id);
        const captures = await findCapturesBySite(userId, siteName);
        return (0, responseHandlers_1.SuccessResponse)({
            res,
            message: `Captures for site '${siteName}' retrieved successfully`,
            data: captures,
        });
    }
    catch (error) {
        console.error("[Capture] Site query error:", error);
        return (0, responseHandlers_1.ErrorResponse)({
            res,
            statusCode: 500,
            message: "Failed to retrieve captures by site name",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.getCapturesBySiteQuery = getCapturesBySiteQuery;
const getCapturesBySiteParam = async (req, res) => {
    try {
        const { siteName } = req.params;
        if (!siteName) {
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 400,
                message: "Site name parameter is required",
            });
        }
        const userId = new mongoose_1.Types.ObjectId(req.user.id);
        const captures = await findCapturesBySite(userId, siteName);
        return (0, responseHandlers_1.SuccessResponse)({
            res,
            message: `Captures for site '${siteName}' retrieved successfully`,
            data: captures,
        });
    }
    catch (error) {
        console.error("[Capture] Site param error:", error);
        return (0, responseHandlers_1.ErrorResponse)({
            res,
            statusCode: 500,
            message: "Failed to retrieve captures by site name",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
exports.getCapturesBySiteParam = getCapturesBySiteParam;
exports.default = {
    getAllDistinctSites: exports.getAllDistinctSites,
    getCapturesBySiteQuery: exports.getCapturesBySiteQuery,
    getCapturesBySiteParam: exports.getCapturesBySiteParam,
    findCapturesBySite,
};
//# sourceMappingURL=sourceController.js.map