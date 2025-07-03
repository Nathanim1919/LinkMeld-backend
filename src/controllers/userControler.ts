import { Request, Response } from "express";
import { Capture } from "../models/Capture";
import Collection from "../models/Collection";
import UserProfile, { IUserProfile } from "../models/UserProfile";

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

    console.info(`[UserProfile] Adding Gemini API key for user: ${user?.id}`);
    console.info(`[UserProfile] Gemini API key: ${geminiApiKey ? "provided" : "not provided"}`);

    if (!user || !user.id) {
      res.status(401).json({ message: "Unauthorized: user not found" });
      return;
    }

    if (!geminiApiKey) {
      res.status(400).json({ message: "Gemini API key is required" });
      return;
    }

    const userId = user.id;

    let profile = (await UserProfile.findOne({
      userId,
    })) as IUserProfile | null;

    if (!profile) {
      console.info(`[UserProfile] Creating new profile for ${userId}`);
      profile = new UserProfile({ userId });
    } else {
      console.info(`[UserProfile] Updating Gemini API key for ${userId}`);
    }

    profile.setGeminiKey(geminiApiKey); // Automatically encrypted
    await profile.save();

    res.status(profile.isNew ? 201 : 200).json({
      message: profile.isNew
        ? "User profile created with Gemini API key"
        : "Gemini API key updated successfully",
    });
  } catch (error) {
    console.error("[UserProfile] Error adding Gemini API key:", error);
    res.status(500).json({
      message: "Internal server error while saving Gemini API key",
      error: (error as Error).message || error,
    });
  }
};



export const getUserProfileInfo = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { user } = req;

    if (!user || !user.id) {
      res.status(401).json({ message: "Unauthorized: user not found" });
      return;
    }

    let userProfile = await UserProfile.findOne({ userId: user.id })
  .select('+externalServices.gemini.apiKey');

    // Create an empty profile if one doesn't exist
    if (!userProfile) {
      userProfile = await UserProfile.create({ userId: user.id });
      res.status(201).json({
        message: "User profile created",
        userId: userProfile.userId,
        externalServices: {
          gemini: {
            hasApiKey: false,
          },
        },
      });
      return;
    }

    // You can safely return only public-facing data
    res.status(200).json({
      userId: userProfile.userId,
      externalServices: {
        gemini: {
          hasApiKey: !!userProfile.externalServices?.gemini?.apiKey,
        },
      },
    });
  } catch (error) {
    console.error("[getUserProfileInfo] Failed to fetch user profile:", error);
    res.status(500).json({ message: "Failed to get user profile", error });
  }
};