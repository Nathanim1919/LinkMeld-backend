"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const algorithm = "aes-256-gcm";
const IV_LENGTH = 16;
const SECRET_KEY = process.env.ENCRYPTION_KEY;
if (!SECRET_KEY) {
    throw new Error("ENCRYPTION_KEY is not defined in environment variables.");
}
const key = Buffer.from(SECRET_KEY, "hex");
if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes).");
}
function encrypt(plainText) {
    try {
        if (!plainText || typeof plainText !== "string") {
            return "";
        }
        const iv = crypto_1.default.randomBytes(IV_LENGTH);
        const cipher = crypto_1.default.createCipheriv(algorithm, key, iv);
        const encrypted = Buffer.concat([
            cipher.update(plainText, "utf8"),
            cipher.final(),
        ]);
        const authTag = cipher.getAuthTag();
        return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
    }
    catch (err) {
        console.error("[encrypt] Failed to encrypt data:", err);
        throw err;
    }
}
function decrypt(encryptedText) {
    try {
        if (!encryptedText || typeof encryptedText !== "string") {
            return "";
        }
        const [ivHex, tagHex, encryptedHex] = encryptedText.split(":");
        if (!ivHex || !tagHex || !encryptedHex) {
            throw new Error("decrypt(): Malformed input string.");
        }
        const iv = Buffer.from(ivHex, "hex");
        const authTag = Buffer.from(tagHex, "hex");
        const encrypted = Buffer.from(encryptedHex, "hex");
        const decipher = crypto_1.default.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]);
        return decrypted.toString("utf8");
    }
    catch (err) {
        console.error("[decrypt] Failed to decrypt data:", err);
        return "";
    }
}
//# sourceMappingURL=crypto.js.map