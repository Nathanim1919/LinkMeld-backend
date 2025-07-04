import { Request, Response } from "express";
import { Capture } from "../models/Capture";
import Collection from "../models/Collection";
import UserProfile, { IUserProfile } from "../models/UserProfile";
import { logger } from "../utils/logger";
import { IUser } from "../types/userTypes";
import { ErrorResponse, SuccessResponse } from "../utils/responseHandlers";
import { validateApiKey } from "../utils/validators";

// Constants
const SERVICE_NAME = "UserProfileService";
const GEMINI_SERVICE = "gemini";

/**
 * @class UserProfileController
 * @description Handles all user profile related operations
 */
export class UserProfileController {
  /**
   * @method resetAllData
   * @description Resets all user data including captures and collections
   */
  static async resetAllData(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      if (!user?.id) {
        ErrorResponse({
          res,
          statusCode: 401,
          message: "Unauthorized: Invalid user credentials",
        });
        return;
      }

      logger.info(`${SERVICE_NAME}:resetAllData`, { userId: user.id });

      // Execute in parallel for better performance
      await Promise.all([
        UserProfileController.clearUserCaptures(user.id),
        UserProfileController.clearUserCollections(user.id),
      ]);

      SuccessResponse({
        res,
        statusCode: 200,
        data: {
          message: "All user data has been successfully reset",
          resetItems: ["captures", "collections"],
        },
      });
    } catch (error) {
      logger.error(`${SERVICE_NAME}:resetAllData:error`, error);
      ErrorResponse({
        res,
        statusCode: 500,
        message: "Failed to reset user data",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * @method clearUserCaptures
   * @description Clears all captures for a user
   * @param userId - The user ID
   */
  static async clearUserCaptures(userId: string): Promise<void> {
    try {
      const result = await Capture.deleteMany({ owner: userId });
      logger.info(`${SERVICE_NAME}:clearUserCaptures`, {
        userId,
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      logger.error(`${SERVICE_NAME}:clearUserCaptures:error`, {
        userId,
        error,
      });
      throw new Error("Failed to clear user captures");
    }
  }

  /**
   * @method clearUserCollections
   * @description Clears all collections for a user
   * @param userId - The user ID
   */
  static async clearUserCollections(userId: string): Promise<void> {
    try {
      const result = await Collection.deleteMany({ user: userId });
      logger.info(`${SERVICE_NAME}:clearUserCollections`, {
        userId,
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      logger.error(`${SERVICE_NAME}:clearUserCollections:error`, {
        userId,
        error,
      });
      throw new Error("Failed to clear user collections");
    }
  }

  /**
   * @method upsertGeminiApiKey
   * @description Adds or updates a Gemini API key for the user
   */
  static async upsertGeminiApiKey(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;
      const { geminiApiKey } = req.body;

      // Input validation
      if (!user?.id) {
        ErrorResponse({
          res,
          statusCode: 401,
          message: "Unauthorized: Invalid user credentials",
        });
        return;
      }

      if (!geminiApiKey) {
        ErrorResponse({
          res,
          statusCode: 400,
          message: "Gemini API key is required",
        });
        return;
      }

      if (!validateApiKey.gemini(geminiApiKey)) {
        ErrorResponse({
          res,
          statusCode: 400,
          message: "Invalid Gemini API key format",
        });
        return;
      }

      logger.info(`${SERVICE_NAME}:upsertGeminiApiKey`, {
        userId: user.id,
        keyPresent: !!geminiApiKey,
      });

      // Find or create profile
      const profile = await UserProfile.findOneAndUpdate(
        { userId: user.id },
        {
          $set: { [`externalServices.${GEMINI_SERVICE}.apiKey`]: geminiApiKey },
        },
        { new: true, upsert: true, runValidators: true }
      );

      SuccessResponse({
        res,
        statusCode: 201,
        data: {
          message: "Gemini API key updated successfully",
          hasApiKey: true,
        },
      });
    } catch (error) {
      logger.error(`${SERVICE_NAME}:upsertGeminiApiKey:error`, error);
      
      ErrorResponse({
        res,
        statusCode: 500,
        message: "Failed to upsert Gemini API key",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * @method getUserProfile
   * @description Retrieves user profile information
   */
  static async getUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as IUser;

      if (!user?.id) {
        ErrorResponse({
          res,
          statusCode: 401,
          message: "Unauthorized: Invalid user credentials",
        });
        return;
      }

      logger.info(`${SERVICE_NAME}:getUserProfile`, { userId: user.id });

      // Type the profile explicitly
      let profile: (IUserProfile & { _id: any }) | null =
        await UserProfile.findOne({ userId: user.id })
          .select(`+externalServices.${GEMINI_SERVICE}.apiKey`)
          .lean<IUserProfile & { _id: any }>()
          .exec();

      // Create profile if it doesn't exist
      if (!profile) {
        const newProfile = await UserProfile.create({ userId: user.id });
        logger.info(`${SERVICE_NAME}:getUserProfile:created`, {
          userId: user.id,
        });

        // Convert to plain object and cast to the correct type
        profile = newProfile.toObject() as IUserProfile & { _id: any };
      }

      // Sanitize response with proper typing
      const response = {
        userId: profile.userId,
        externalServices: {
          [GEMINI_SERVICE]: {
            hasApiKey: !!profile.externalServices?.[GEMINI_SERVICE]?.apiKey,
          },
        },
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      };

      SuccessResponse({
        res,
        statusCode: 200,
        data: response,
        message: "User profile retrieved successfully",
      });
    } catch (error) {
      logger.error(`${SERVICE_NAME}:getUserProfile:error`, error);
      ErrorResponse({
        res,
        statusCode: 500,
        message: "Failed to retrieve user profile",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
