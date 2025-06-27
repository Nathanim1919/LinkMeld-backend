import { Request, Response } from "express";

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
  // Implement the logic to clear all captures for the user
  // This could involve deleting records from a database or clearing a cache
  console.log(`Clearing captures for user: ${user.id}`);
  // Example: await CaptureModel.deleteMany({ userId: user.id });
};

export const clearFolders = async (user: any): Promise<void> => {
  // Implement the logic to clear all folders for the user
  // This could involve deleting records from a database or clearing a cache
  console.log(`Clearing folders for user: ${user.id}`);
  // Example: await FolderModel.deleteMany({ userId: user.id });
};
