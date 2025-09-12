"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadPdfToBlob = void 0;
const storage_blob_1 = require("@azure/storage-blob");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = "pdfs";
const blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const uploadPdfToBlob = async (buffer, fileName) => {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    const uploadBlobResponse = await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: {
            blobContentType: "application/pdf",
        },
    });
    if (uploadBlobResponse.errorCode) {
        throw new Error(`Azure Blob Upload Failed: ${uploadBlobResponse.errorCode}`);
    }
    return blockBlobClient.url;
};
exports.uploadPdfToBlob = uploadPdfToBlob;
//# sourceMappingURL=azureBlob.js.map