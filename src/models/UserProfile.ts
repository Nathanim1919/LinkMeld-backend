// models/UserProfile.ts
import mongoose, { Schema } from "mongoose";
import { encrypt, decrypt } from "../security/crypto";

const UserProfileSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, unique: true }, // BetterAuth user ID (usr_xyz)
    
    // Extra fields you want to manage
    externalServices: {
      gemini: {
        apiKey: {
          type: String,
          set: (value: string) => encrypt(value),
          get: (value: string) => decrypt(value),
          select: false,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

UserProfileSchema.methods.getGeminiKey = function () {
  return this.externalServices?.gemini?.apiKey;
};

UserProfileSchema.methods.setGeminiKey = function (apiKey: string) {
  this.externalServices = {
    ...this.externalServices,
    gemini: { apiKey },
  };
};

const UserProfile = mongoose.model("UserProfile", UserProfileSchema);
export default UserProfile;
