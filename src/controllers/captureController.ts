import { Request, Response } from 'express';
import Capture, { ICapture } from '../models/Capture';

export const saveCapture = async (req: Request, res: Response): Promise<void> => {
  console.log('Saving capture:', req.body);
  try {
    const { url, timestamp, text, html } = req.body;

    const capture = new Capture({
      url,
      timestamp,
      text,
      html
    });

    await capture.save();
    res.status(201).json({ message: 'Capture saved successfully', capture });
  } catch (error) {
    console.error('Error saving capture:', error);
    res.status(500).json({ message: 'Error saving capture', error: error.message });
  }
};

export const getCaptures = async (req: Request, res: Response): Promise<void> => {
  try {
    const captures = await Capture.find().sort({ timestamp: -1 });
    res.status(200).json(captures);
  } catch (error) {
    console.error('Error fetching captures:', error);
    res.status(500).json({ message: 'Error fetching captures', error: error.message });
  }
}; 