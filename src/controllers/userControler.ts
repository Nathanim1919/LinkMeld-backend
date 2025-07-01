import { Request, Response } from "express";
import { Capture } from "../models/Capture";
import Collection from "../models/Collection";
import User from "../models/User";
import UserProfile from "../models/UserProfile";

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
    await Capture.deleteMany({ owner: user.id });
  } catch (error) {
    throw new Error(`Failed to clear captures: ${error.message}`);
  }
};

export const clearFolders = async (user: any): Promise<void> => {
  try {
    await Collection.deleteMany({ user: user.id });
  } catch (error) {
    throw new Error(`Failed to clear folders: ${error.message}`);
  }
};

export const addGeminiApiKey = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { user } = req;
    const { geminiApiKey } = req.body;

    const activeUser = await User.findById(user.id);
    console.log(`Active User: ${activeUser}`);

    if (!activeUser) {
      res.status(401).json({
        message: "User Not Found",
      });
      return;
    }

    activeUser.setGeminiKey = geminiApiKey;
    console.log(`Active User: ${activeUser}`);
    await activeUser.save();
  } catch (error) {
    console.error("[LinkMeld] Error setting Gemini API Key:", error);
    throw new Error(`Failed to set Gemini Api Key!!`);
  }
};




export const createUserProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { user } = req;
    if (!user) {
      res.status(400).json({ message: "User not found" });
      return;
    }

    const userProfile = await UserProfile.findOne({ userId: user.id });
    if (userProfile) {
      res.status(200).json({ message: "User profile already exists" });
      return;
    }

    const newUserProfile = new UserProfile({
      userId: user.id,
      externalServices: {
        gemini: {
          apiKey: "",
        },
      },
    });

    await newUserProfile.save();
    res.status(201).json({ message: "User profile created successfully" });
  } catch (error) {
    console.error("[LinkMeld] Error creating user profile:", error);
    res.status(500).json({ message: "Error creating user profile", error });
  }
}
