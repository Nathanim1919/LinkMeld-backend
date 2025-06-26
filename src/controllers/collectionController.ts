import mongoose from "mongoose";
import Collection, { ICollection } from "../models/Collection";
import { Request, Response } from "express";
import { Capture } from "../models/Capture";

export const createCollection = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, parentCollection } = req.body;

    if (!name) {
      res.status(400).json({ message: "Collection name is required" });
      return;
    }
    const folderData: Partial<ICollection> = {
      name: name.trim(),
    };

    if (
      parentCollection &&
      !mongoose.Types.ObjectId.isValid(parentCollection)
    ) {
      res.status(400).json({ message: "Invalid parent collection ID" });
      return;
    }
    // Check if collection with the same name already exists in the user's collections
    const existingCollection = await Collection.findOne({
      name: folderData.name,
    });
    if (existingCollection) {
      res.status(409).json({
        message:
          "Collection with this name already exists in the specified parent collection",
      });
      return;
    }

    const newCollection = await Collection.create(folderData);
    res.status(201).json(newCollection);
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
    const collections = await Collection.find().populate("captures");
    res.status(200).json(collections);
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

    const collection = await Collection.findById(id).populate("captures");
    if (!collection) {
      res.status(404).json({ message: "Collection not found" });
      return;
    }

    res.status(200).json(collection);
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

    const collection = await Collection.findById(id);
    if (!collection) {
      res.status(404).json({ message: "collection not found" });
      return;
    }
    if (!collection) {
      res.status(404).json({ message: "collection not found" });
      return;
    }

    // Check if capture exists
    const capture = await Capture.findById(captureId);
    if (!capture) {
      res.status(404).json({ message: "Capture not found" });
      return;
    }
    // Check if capture already exists in the folder
    if (collection.captures && collection.captures.includes(captureId)) {
      res
        .status(409)
        .json({ message: "Capture already exists in this folder" });
      return;
    }
    // Append capture to the folder's captures array
    collection.captures = collection.captures || [];
    collection.captures.push(captureId);
    await collection.save();
    // Optionally, you can also update the capture's folder reference
    capture.collection = collection._id as any;
    await capture.save();
    // Return success response
    res.status(200).json({ message: "Capture added to folder successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
};
export const removeCaptureFromFolder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { folderId, captureId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      res.status(400).json({ message: "Invalid folder ID" });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(captureId)) {
      res.status(400).json({ message: "Invalid capture ID" });
      return;
    }

    const collection = await Collection.findById(folderId);
    if (!collection) {
      res.status(404).json({ message: "Folder not found" });
      return;
    }
    // Check if capture exists in the collection
    if (!collection.captures || !collection.captures.includes(captureId)) {
      res.status(404).json({ message: "Capture not found in this folder" });
      return;
    }
    // Remove capture from the collection's captures array
    collection.captures = collection.captures.filter(
      (id) => id.toString() !== captureId.toString()
    );
    await collection.save();
    res
      .status(200)
      .json({ message: "Capture removed from folder successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
};
export const deleteFolder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid folder ID" });
      return;
    }

    const collection = await Collection.findByIdAndDelete(id);
    if (!collection) {
      res.status(404).json({ message: "Collection not found" });
      return;
    }

    res.status(200).json({ message: "Collection deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
};
export const updateFolder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, parentFolder } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid folder ID" });
      return;
    }

    const collection = await Collection.findById(id);
    if (!collection) {
      res.status(404).json({ message: "Collection not found" });
      return;
    }

    if (name) {
      collection.name = name.trim();
    }

    if (parentFolder && !mongoose.Types.ObjectId.isValid(parentFolder)) {
      res.status(400).json({ message: "Invalid parent folder ID" });
      return;
    }

    collection.parentCollection = parentFolder || null;

    await collection.save();
    res.status(200).json(collection);
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
};

export const getCapturesWithSpecificFolder = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id as string)) {
      res.status(400).json({ message: "Invalid or missing folder ID" });
      return;
    }

    // i get array of captures in the folder but also each capture has an id of collection so let's populate the captures
    const collection = await Collection.findById(id)
                                                    .populate({
                                                      path: 'captures',
                                                      populate: {
                                                        path: 'collection',
                                                        model: 'Collection',
                                                      }
                                                    });


    if (!collection) {
      res.status(404).json({ message: "Collection not found" });
      return;
    }

    res.status(200).json(collection.captures);
  } catch (error) {
    console.error("[LinkMeld] Error fetching captures by folder:", error);
    res.status(500).json({ message: "Error fetching captures by folder" });
  }
};
