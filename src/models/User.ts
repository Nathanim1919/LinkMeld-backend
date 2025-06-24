import mongoose, { Schema } from "mongoose";

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true }, // Changed from username to name to match frontend
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Changed to password
    isVerified: {
      type: Boolean,
      default: false,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true, // Automatically updates createdAt, updatedAt
  }
);

const User = mongoose.model("User", UserSchema);
export default User;
