// security/crypto.ts
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

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

export function encrypt(plainText: string): string {
  try {
    if (typeof plainText !== "string") {
      throw new Error("encrypt(): input must be a string.");
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plainText, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
  } catch (err) {
    console.error("[encrypt] Failed to encrypt data:", err);
    throw err;
  }
}

export function decrypt(encryptedText: string): string {
  try {
    const [ivHex, tagHex, encryptedHex] = encryptedText.split(":");
    if (!ivHex || !tagHex || !encryptedHex) {
      throw new Error("decrypt(): Malformed input string.");
    }

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(tagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (err) {
    console.error("[decrypt] Failed to decrypt data:", err);
    throw err;
  }
}
