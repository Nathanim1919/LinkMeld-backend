import mongoose, { Schema } from "mongoose";
import { decrypt, encrypt } from "../security/crypto";

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true }, // Changed from username to name to match frontend
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Changed to password
    emailVerified: {
      type: Boolean,
      default: false,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    externalServices: {
      gemini: {
        apiKey: {
          type: String,
          set: (value: string) => encrypt(value), // Always encrypt at rest
          get: (value: string) => decrypt(value),
          select: false, // Do not return this field by default
        },
      },
    },
  },
  {
    timestamps: true, // Automatically updates createdAt, updatedAt
  }
);


UserSchema.methods.getGeminiKey = function() {
  return this.externalServices.gemini.apiKey;
}

UserSchema.methods.setGeminiKey = function(apiKey: string) {
  this.externalServices.gemini.apiKey = apiKey;
}

const User = mongoose.model("User", UserSchema, "user");

export default User;
