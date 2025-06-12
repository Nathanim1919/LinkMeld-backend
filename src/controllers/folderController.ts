import mongoose from "mongoose";
import Folder, { IFolder } from "../models/Folder";
import Capture from "../models/Capture";
import { Request, Response } from "express";

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
      res.status(409).json({
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

export const appendCaptureToFolder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { captureId } = req.body;
    const { id } = req.params;
    if (!id || !captureId) {
      res
        .status(400)
        .json({ message: "Folder ID and Capture ID are required" });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid folder ID" });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(captureId)) {
      res.status(400).json({ message: "Invalid capture ID" });
      return;
    }

    const folder = await Folder.findById(id);
    if (!folder) {
      res.status(404).json({ message: "Folder not found" });
      return;
    }
    if (!folder) {
      res.status(404).json({ message: "Folder not found" });
      return;
    }

    // Check if capture exists
    const capture = await Capture.findById(captureId);
    if (!capture) {
      res.status(404).json({ message: "Capture not found" });
      return;
    }
    // Check if capture already exists in the folder
    if (folder.captures && folder.captures.includes(captureId)) {
      res
        .status(409)
        .json({ message: "Capture already exists in this folder" });
      return;
    }
    // Append capture to the folder's captures array
    folder.captures = folder.captures || [];
    folder.captures.push(captureId);
    await folder.save();
    // Optionally, you can also update the capture's folder reference
    capture.folder = new mongoose.Types.ObjectId(id);
    await capture.save();
    // Return success response
    res.status(200).json({ message: "Capture added to folder successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
};
// export const removeCaptureFromFolder = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { folderId, captureId } = req.body;

//     if (!mongoose.Types.ObjectId.isValid(folderId)) {
//       res.status(400).json({ message: "Invalid folder ID" });
//       return;
//     }

//     if (!mongoose.Types.ObjectId.isValid(captureId)) {
//       res.status(400).json({ message: "Invalid capture ID" });
//       return;
//     }

//     const folder = await Folder.findById(folderId);
//     if (!folder) {
//       res.status(404).json({ message: "Folder not found" });
//       return;
//     }
//     // Check if capture exists in the folder
//     if (!folder.captures || !folder.captures.includes(captureId)) {
//       res.status(404).json({ message: "Capture not found in this folder" });
//       return;
//     }
//     // Remove capture from the folder's captures array
//     folder.captures = folder.captures.filter(
//       (id) => id.toString() !== captureId.toString()
//     );
//     await folder.save();
//     res
//       .status(200)
//       .json({ message: "Capture removed from folder successfully" });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "An error occurred", error: error.message });
//   }
// };
// export const deleteFolder = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { id } = req.params;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       res.status(400).json({ message: "Invalid folder ID" });
//       return;
//     }

//     const folder = await Folder.findByIdAndDelete(id);
//     if (!folder) {
//       res.status(404).json({ message: "Folder not found" });
//       return;
//     }

//     res.status(200).json({ message: "Folder deleted successfully" });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "An error occurred", error: error.message });
//   }
// };
// export const updateFolder = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     const { id } = req.params;
//     const { name, parentFolder } = req.body;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       res.status(400).json({ message: "Invalid folder ID" });
//       return;
//     }

//     const folder = await Folder.findById(id);
//     if (!folder) {
//       res.status(404).json({ message: "Folder not found" });
//       return;
//     }

//     if (name) {
//       folder.name = name.trim();
//     }

//     if (parentFolder && !mongoose.Types.ObjectId.isValid(parentFolder)) {
//       res.status(400).json({ message: "Invalid parent folder ID" });
//       return;
//     }

//     folder.parentFolder = parentFolder || null;

//     await folder.save();
//     res.status(200).json(folder);
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "An error occurred", error: error.message });
//   }
// };
