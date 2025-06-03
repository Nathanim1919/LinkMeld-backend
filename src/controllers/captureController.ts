import { Request, Response } from 'express';
import Capture, { ICapture } from '../models/Capture';
import sanitizeHtml from 'sanitize-html';

export const saveCapture = async (req: Request, res: Response): Promise<void> => {
  console.log('[LinkMeld] Saving capture:', { url: req.body.url, timestamp: req.body.timestamp });
  try {
    const {
      url,
      timestamp,
      metadata,
      mainText,
      images,
      links,
      documents,
      interactive,
    } = req.body;

    // Validate required fields
    if (!url || !timestamp || !mainText) {
      res.status(400).json({ message: 'Missing required fields: url, timestamp, mainText' });
      return;
    }

    // Sanitize mainText
    const cleanText = sanitizeHtml(mainText, {
      allowedTags: [],
      allowedAttributes: {},
    });

    // Filter and deduplicate links
    const uniqueLinks = Array.from(new Map(
      links.map((link: { href: string; text: string }) => [link.href, link])
    ).values());

    // Prepare capture data
    const captureData: Partial<ICapture> = {
      url,
      timestamp: new Date(timestamp),
      metadata: {
        title: metadata?.title || 'Untitled',
        description: metadata?.description || '',
        url: metadata?.url || url,
        favicon: metadata?.favicon || '',
      },
      mainText: cleanText,
      images: images?.map((img: { src: string; alt: string }) => ({
        url: img.src,
        alt: img.alt,
      })) || [],
      links: uniqueLinks as { href: string; text: string }[],
      documents: documents || [],
      interactiveForms: interactive?.forms || [],
    };

    const capture = new Capture(captureData);
    await capture.save();

    console.log('[LinkMeld] Capture saved:', { id: capture._id, url });
    res.status(201).json({ message: 'Capture saved successfully', captureId: capture._id });
  } catch (error) {
    console.error('[LinkMeld] Error saving capture:', error);
    res.status(500).json({ message: 'Error saving capture', error: error.message });
  }
};

export const getCaptures = async (req: Request, res: Response): Promise<void> => {
  try {
    const captures = await Capture.find().sort({ timestamp: -1 }).limit(50);
    res.status(200).json(captures);
  } catch (error) {
    console.error('[LinkMeld] Error fetching captures:', error);
    res.status(500).json({ message: 'Error fetching captures', error: error.message });
  }
};