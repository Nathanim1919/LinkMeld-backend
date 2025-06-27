import { Request, Response } from "express";
import { Capture } from "../models/Capture";

// Get all distinct sources from the Capture model (siteName)
export const getAllDistinctSiteName = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Fetch distinct site names from the metadata.siteName field
    const siteNames = await Capture.distinct("metadata.siteName");

    if (!siteNames || siteNames.length === 0) {
      res.status(404).json({
        message: "No distinct site names found",
      });
      return;
    }

    // get the number of captures for each site name
    const siteNameCounts = await Capture.aggregate([
      {
        $group: {
          _id: "$metadata.siteName",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          siteName: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);
    // Convert the counts to a map for easier access
    const siteNameCountMap = siteNameCounts.reduce(
      (acc, { siteName, count }) => {
        acc[siteName] = count;
        return acc;
      },
      {}
    );

    res.status(200).json({
      message: "Successfully fetched all distinct site names",
      siteNames,
      siteNameCounts: siteNameCountMap,
    });
  } catch (error) {
    console.error("[LinkMeld] Error fetching distinct site names:", error);
    res.status(500).json({
      message: "Error fetching distinct site names",
    });
  }
};

export const getCapturesWithSiteName = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { siteName } = req.query;

  if (!siteName || typeof siteName !== "string") {
    res.status(400).json({
      message: "Invalid or missing siteName query parameter",
    });
    return;
  }

  try {
    // Fetch captures with the specified siteName
    const captures = await Capture.find({
      "metadata.siteName": siteName,
    })
      .sort({ timestamp: -1 }) // Sort by timestamp in descending order
      .populate("collection", "name") // Populate collection name
      .exec();

    if (!captures || captures.length === 0) {
      res.status(404).json({
        message: `No captures found for siteName: ${siteName}`,
      });
      return;
    }

    res.status(200).json({
      message: `Successfully fetched captures for siteName: ${siteName}`,
      captures,
    });
  } catch (error) {
    console.error("[LinkMeld] Error fetching captures by site name:", error);
    res.status(500).json({
      message: "Error fetching captures by site name",
    });
  }
};

export const getCapturesWithSpecificSiteName = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { siteName } = req.params;

  if (!siteName || typeof siteName !== "string") {
    res.status(400).json({
      message: "Invalid or missing siteName parameter",
    });
    return;
  }

  try {
    // Fetch captures with the specified siteName
    const captures = await Capture.find({
      "metadata.siteName": siteName,
    })
      .sort({ timestamp: -1 }) // Sort by timestamp in descending order
      .populate("collection", "name") // Populate folder name
      .exec();

    if (!captures || captures.length === 0) {
      res.status(404).json({
        message: `No captures found for siteName: ${siteName}`,
      });
      return;
    }

    res.status(200).json(captures);
  } catch (error) {
    console.error("[LinkMeld] Error fetching captures by site name:", error);
    res.status(500).json({
      message: "Error fetching captures by site name",
    });
  }
};
