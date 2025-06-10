import mongoose, { Document } from "mongoose";

export interface IFolder extends Document {
  user: mongoose.Types.ObjectId;
  name: string;
  captures?: mongoose.Types.ObjectId[];
  parentFolder?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FolderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    captures: [{ type: mongoose.Schema.Types.ObjectId, ref: "Capture" }],
    parentFolder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IFolder>("Folder", FolderSchema);
