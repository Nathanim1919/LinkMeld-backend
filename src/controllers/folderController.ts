import mongoose from "mongoose";
import Folder from "src/models/Folder";
import { Request, Response } from "express";
import { IFolder } from "src/models/Folder";

export const createFolder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, parentFolder } = req.body;

    if (!name) {
      res.status(400).json({ message: "Folder name is required" });
      return;
    }
    const folderData: Partial<IFolder> = {
      name: name.trim(),
    };

    if (parentFolder && !mongoose.Types.ObjectId.isValid(parentFolder)) {
      res.status(400).json({ message: "Invalid parent folder ID" });
      return;
    }
    // Check if folder with the same name already exists in the user's folders
    const existingFolder = await Folder.findOne({ name: folderData.name });
    if (existingFolder) {
      res
        .status(409)
        .json({
          message:
            "Folder with this name already exists in the specified parent folder",
        });
      return;
    }

    const newFolder = await Folder.create(folderData);
    res.status(201).json(newFolder);
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
};

export const getFolders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const folders = await Folder.find().populate("captures");
    res.status(200).json(folders);
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
};

export const getFolderById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid folder ID" });
      return;
    }

    const folder = await Folder.findById(id).populate("captures");
    if (!folder) {
      res.status(404).json({ message: "Folder not found" });
      return;
    }

    res.status(200).json(folder);
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
};
