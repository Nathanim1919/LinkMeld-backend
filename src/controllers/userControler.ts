import { Request, Response } from "express";
import { Capture } from "../models/Capture";
import Collection from "../models/Collection";

// reset ll user captures, folders, and all data
export const resetAllData = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { user } = req;
    if (!user) {
      res.status(400).json({ message: "User not found" });
      return;
    }

    console.log(`Resetting all data for user: ${user}`);

    await clearCaptures(user);
    await clearFolders(user);


    res
      .status(200)
      .json({ message: "All user captures and folders have been reset." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
};

export const clearCaptures = async (user: any): Promise<void> => {
  try {
    const res = await Capture.deleteMany({ owner: user.id });
    console.log(`Deleted ${res.deletedCount} captures for user: ${user.id}`);
    // Optionally, you can also clear any related collections or folders if needed
  } catch (error) {
    console.error(`Error clearing captures for user ${user.id}:`, error);
    throw new Error(`Failed to clear captures: ${error.message}`);
  }
};

export const clearFolders = async (user: any): Promise<void> => {
  try {
    // Assuming you have a Folder model to manage user folders
    // Replace with your actual folder model and logic
    const res = await Collection.deleteMany({ user: user.id });
    console.log(`Deleted ${res.deletedCount} folders for user: ${user.id}`);
  } catch (error) {
    console.error(`Error clearing folders for user ${user.id}:`, error);
    throw new Error(`Failed to clear folders: ${error.message}`);
  }
};
