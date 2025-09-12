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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const Collection_1 = __importDefault(require("../common/models/Collection"));
const Capture_1 = require("../common/models/Capture");
const responseHandlers_1 = require("../common/utils/responseHandlers");
const validateObjectId = (id) => mongoose_1.default.Types.ObjectId.isValid(id);
exports.default = {
    async createCollection(req, res) {
        try {
            const { name, parentCollection } = req.body;
            const { user } = req;
            if (!user) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 401,
                    message: "User not authenticated",
                });
            }
            if (!name) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 400,
                    message: "Collection name is required",
                });
            }
            if (parentCollection && !validateObjectId(parentCollection)) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 400,
                    message: "Invalid parent collection ID",
                });
            }
            const existingCollection = await Collection_1.default.findOne({
                name: name.trim(),
                user: user.id,
            });
            if (existingCollection) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 409,
                    message: "Collection with this name already exists",
                });
            }
            const collection = await Collection_1.default.create({
                user: user.id,
                name: name.trim(),
                parentCollection: parentCollection || null,
            });
            return (0, responseHandlers_1.SuccessResponse)({
                res,
                statusCode: 201,
                data: collection,
                message: "Collection created successfully",
            });
        }
        catch (error) {
            console.error("[Collection] Create error:", error);
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 500,
                message: "Failed to create collection",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    },
    async getCollections(req, res) {
        var _a;
        try {
            const collections = await Collection_1.default.find({
                user: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
            }).populate("captures");
            return (0, responseHandlers_1.SuccessResponse)({
                res,
                data: collections,
                message: "Collections retrieved successfully",
            });
        }
        catch (error) {
            console.error("[Collection] Fetch all error:", error);
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 500,
                message: "Failed to fetch collections",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    },
    async getCollectionById(req, res) {
        var _a;
        try {
            const { id } = req.params;
            if (!validateObjectId(id)) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 400,
                    message: "Invalid collection ID",
                });
            }
            const collection = await Collection_1.default.findOne({
                _id: id,
                user: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
            }).populate("captures");
            if (!collection) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 404,
                    message: "Collection not found",
                });
            }
            return (0, responseHandlers_1.SuccessResponse)({
                res,
                data: collection,
                message: "Collection retrieved successfully",
            });
        }
        catch (error) {
            console.error("[Collection] Fetch by ID error:", error);
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 500,
                message: "Failed to fetch collection",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    },
    async addCaptureToCollection(req, res) {
        var _a;
        try {
            const { id } = req.params;
            const { captureId } = req.body;
            if (!id || !captureId) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 400,
                    message: "Collection ID and Capture ID are required",
                });
            }
            if (!validateObjectId(id) || !validateObjectId(captureId)) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 400,
                    message: "Invalid ID format",
                });
            }
            const [collection, capture] = await Promise.all([
                Collection_1.default.findById(id),
                Capture_1.Capture.findById(captureId),
            ]);
            if (!collection) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 404,
                    message: "Collection not found",
                });
            }
            if (!capture) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 404,
                    message: "Capture not found",
                });
            }
            if ((_a = collection.captures) === null || _a === void 0 ? void 0 : _a.some((id) => id.equals(captureId))) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 409,
                    message: "Capture already exists in this collection",
                });
            }
            if (capture.collection) {
                await Collection_1.default.findByIdAndUpdate(capture.collection, {
                    $pull: { captures: capture._id },
                });
            }
            await Promise.all([
                Collection_1.default.findByIdAndUpdate(id, {
                    $addToSet: { captures: capture._id },
                }),
                Capture_1.Capture.findByIdAndUpdate(captureId, {
                    collection: collection._id,
                }),
            ]);
            const updatedCollection = await Collection_1.default.findById(id).populate("captures");
            return (0, responseHandlers_1.SuccessResponse)({
                res,
                data: updatedCollection,
                message: "Capture added to collection successfully",
            });
        }
        catch (error) {
            console.error("[Collection] Add capture error:", error);
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 500,
                message: "Failed to add capture to collection",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    },
    async removeCaptureFromCollection(req, res) {
        var _a;
        try {
            const { collectionId, captureId } = req.body;
            if (!collectionId || !captureId) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 400,
                    message: "Collection ID and Capture ID are required",
                });
            }
            if (!validateObjectId(collectionId) || !validateObjectId(captureId)) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 400,
                    message: "Invalid ID format",
                });
            }
            const collection = await Collection_1.default.findById(collectionId);
            if (!collection) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 404,
                    message: "Collection not found",
                });
            }
            if (!((_a = collection.captures) === null || _a === void 0 ? void 0 : _a.includes(new mongoose_1.Types.ObjectId(captureId)))) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 404,
                    message: "Capture not found in this collection",
                });
            }
            await Promise.all([
                Collection_1.default.findByIdAndUpdate(collectionId, {
                    $pull: { captures: captureId },
                }),
                Capture_1.Capture.findByIdAndUpdate(captureId, {
                    $unset: { collection: "" },
                }),
            ]);
            const updatedCollection = await Collection_1.default.findById(collectionId).populate("captures");
            return (0, responseHandlers_1.SuccessResponse)({
                res,
                data: updatedCollection,
                message: "Capture removed from collection successfully",
            });
        }
        catch (error) {
            console.error("[Collection] Remove capture error:", error);
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 500,
                message: "Failed to remove capture from collection",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    },
    async deleteCollection(req, res) {
        try {
            const { id } = req.params;
            if (!validateObjectId(id)) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 400,
                    message: "Invalid collection ID",
                });
            }
            await Capture_1.Capture.updateMany({ collection: id }, { $unset: { collection: "" } });
            const deletedCollection = await Collection_1.default.findByIdAndDelete(id);
            if (!deletedCollection) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 404,
                    message: "Collection not found",
                });
            }
            return (0, responseHandlers_1.SuccessResponse)({
                res,
                data: { id: deletedCollection._id },
                message: "Collection deleted successfully",
            });
        }
        catch (error) {
            console.error("[Collection] Delete error:", error);
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 500,
                message: "Failed to delete collection",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    },
    async updateCollection(req, res) {
        try {
            const { id } = req.params;
            const { name, parentCollection } = req.body;
            if (!validateObjectId(id)) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 400,
                    message: "Invalid collection ID",
                });
            }
            const updates = {};
            if (name)
                updates.name = name.trim();
            if (parentCollection) {
                if (!validateObjectId(parentCollection)) {
                    return (0, responseHandlers_1.ErrorResponse)({
                        res,
                        statusCode: 400,
                        message: "Invalid parent collection ID",
                    });
                }
                updates.parentCollection = parentCollection;
            }
            const updatedCollection = await Collection_1.default.findByIdAndUpdate(id, updates, { new: true }).populate("captures");
            if (!updatedCollection) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 404,
                    message: "Collection not found",
                });
            }
            return (0, responseHandlers_1.SuccessResponse)({
                res,
                data: updatedCollection,
                message: "Collection updated successfully",
            });
        }
        catch (error) {
            console.error("[Collection] Update error:", error);
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 500,
                message: "Failed to update collection",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    },
    async getCollectionCaptures(req, res) {
        try {
            const { id } = req.params;
            if (!id || !validateObjectId(id)) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 400,
                    message: "Invalid collection ID",
                });
            }
            const collection = await Collection_1.default.findById(id).populate({
                path: "captures",
                populate: {
                    path: "collection",
                    model: "Collection",
                },
            });
            if (!collection) {
                return (0, responseHandlers_1.ErrorResponse)({
                    res,
                    statusCode: 404,
                    message: "Collection not found",
                });
            }
            return (0, responseHandlers_1.SuccessResponse)({
                res,
                data: collection.captures || [],
                message: "Collection captures retrieved successfully",
            });
        }
        catch (error) {
            console.error("[Collection] Get captures error:", error);
            return (0, responseHandlers_1.ErrorResponse)({
                res,
                statusCode: 500,
                message: "Failed to retrieve collection captures",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    },
};
//# sourceMappingURL=collectionController.js.map