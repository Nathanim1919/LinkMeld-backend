import { Request, Response } from "express";
import { Capture } from "../models/Capture";
import { Types } from "mongoose"; // import ObjectId converter

export const getAllDistinctSiteName = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = new Types.ObjectId(req.user.id); // convert to ObjectId

    const siteNames = await Capture.distinct("metadata.siteName", {
      owner: userId, // filter by owner
    });

    if (!siteNames || siteNames.length === 0) {
      res.status(404).json({ message: "No distinct site names found" });
      return;
    }

    // Add $match stage to aggregation to filter by owner
    const siteNameCounts = await Capture.aggregate([
      { $match: { owner: userId } },
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

    const siteNameCountMap = siteNameCounts.reduce((acc, { siteName, count }) => {
      acc[siteName] = count;
      return acc;
    }, {});

    res.status(200).json({
      message: "Successfully fetched all distinct site names",
      siteNames,
      siteNameCounts: siteNameCountMap,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching distinct site names" });
  }
};

export const getCapturesWithSiteName = async (req: Request, res: Response): Promise<void> => {
  const { siteName } = req.query;

  if (!siteName || typeof siteName !== "string") {
    res.status(400).json({ message: "Invalid or missing siteName query parameter" });
    return;
  }

  try {
    const userId = new Types.ObjectId(req.user.id);

    const captures = await Capture.find({
      "metadata.siteName": siteName,
      owner: userId, // filter by owner
    })
      .sort({ timestamp: -1 })
      .populate("collection", "name")
      .exec();

    if (!captures || captures.length === 0) {
      res.status(404).json({ message: `No captures found for siteName: ${siteName}` });
      return;
    }

    res.status(200).json({
      message: `Successfully fetched captures for siteName: ${siteName}`,
      captures,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching captures by site name" });
  }
};

export const getCapturesWithSpecificSiteName = async (req: Request, res: Response): Promise<void> => {
  const { siteName } = req.params;

  if (!siteName || typeof siteName !== "string") {
    res.status(400).json({ message: "Invalid or missing siteName parameter" });
    return;
  }

  try {
    const userId = new Types.ObjectId(req.user.id);

    const captures = await Capture.find({
      "metadata.siteName": siteName,
      owner: userId, // **Add this filter**
    })
      .sort({ timestamp: -1 })
      .populate("collection", "name")
      .exec();

    if (!captures || captures.length === 0) {
      res.status(404).json({ message: `No captures found for siteName: ${siteName}` });
      return;
    }

    res.status(200).json(captures);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching captures by site name" });
  }
};
