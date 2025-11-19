"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToR2 = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const crypto_1 = require("crypto");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const r2 = new client_s3_1.S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.CF_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
});
const isMulterFile = (file) => "originalname" in file && "mimetype" in file;
const uploadToR2 = async (file) => {
    const originalName = isMulterFile(file) ? file.originalname : file.fileName;
    const contentType = isMulterFile(file) ? file.mimetype : file.contentType;
    const fileExt = path_1.default.extname(originalName);
    const key = `videos/${(0, crypto_1.randomUUID)()}${fileExt}`;
    const command = new client_s3_1.PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: contentType,
    });
    await r2.send(command);
    console.log(`${process.env.R2_PUBLIC_DOMAIN}/${key}`);
    return {
        url: `${process.env.R2_PUBLIC_DOMAIN}/${key}`,
        key,
    };
};
exports.uploadToR2 = uploadToR2;
//# sourceMappingURL=r2Upload.js.map