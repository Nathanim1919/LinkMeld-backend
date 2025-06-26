import { Request, Response } from 'express';
import { Capture, ICapture } from '../models/Capture'
import { hashContent } from '../utils/hashing';
import { sanitizeHtml } from '../utils/sanitization';
import { generateSlug } from '../utils/slugify';
import { normalizeUrl } from '../utils/urls';


export const saveCapture = async (req: Request, res: Response) => {
  try {
    // 1. Input Validation
    const requiredFields = ['url', 'timestamp'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const { 
      url,
      title,
      description,
      mainText,
      selectedText,
      documents = [],
      links = [],
      favicon,
      siteName,
      publishedTime,
      author,
      keywords,
      viewport,
      language = 'en',
      userAgent
    } = req.body;

    // 2. Content Preparation
    const contentToSave = selectedText?.trim() || mainText?.trim() || '';
    if (contentToSave.length < 50) {
      return res.status(400).json({
        success: false,
        error: 'Content too short (minimum 50 characters required)'
      });
    }

    // 3. Core Processing
    const isPdf = !!url.match(/\.pdf($|\?)/i);
    const wordCount = contentToSave.split(/\s+/).filter(Boolean).length; // More accurate word count
    const readingTime = Math.ceil(wordCount / 200);

    const normalizeLanguage = (lang: string): string => {
      const supportedLanguages = [
        'none', 'da', 'nl', 'english', 'fi', 'french', 
        'german', 'hungarian', 'italian', 'nb', 'pt', 
        'ro', 'ru', 'es', 'sv', 'tr'
      ];
      
      if (!lang) return 'english';
      
      const langMap: Record<string, string> = {
        'en': 'english',
        'en-US': 'english',
        'en-GB': 'english',
        'es': 'spanish',
        'fr': 'french',
        'de': 'german',
        'pt': 'portuguese',
        'it': 'italian',
        'ru': 'russian'
      };

      const baseLang = lang.split('-')[0].toLowerCase();
      const normalized = langMap[baseLang] || langMap[lang.toLowerCase()];
      
      return supportedLanguages.includes(normalized) 
        ? normalized 
        : 'english';
    };

    // 4. Build Capture Object
    const captureData: Partial<ICapture> = {
      owner: req.user._id,
      url: normalizeUrl(url),
      title: sanitizeHtml(title || 'Untitled', { allowedTags: [] }),
      slug: generateSlug(title || url),
      contentHash: hashContent(contentToSave),

      content: {
        raw: contentToSave,
        clean: sanitizeHtml(contentToSave, { allowedTags: [], allowedAttributes: {} }),
        highlights: [],
        attachments: []
      },

      metadata: {
        description: sanitizeHtml(description || '', { allowedTags: [] }),
        favicon: sanitizeHtml(favicon || '', { allowedTags: [] }),
        siteName: sanitizeHtml(siteName || '', { allowedTags: [] }),
        publishedAt: sanitizeHtml(publishedTime || '', { allowedTags: [] }),
        author: sanitizeHtml(author || '', { allowedTags: [] }),
        keywords: Array.isArray(keywords) 
          ? keywords.map(k => sanitizeHtml(k, { allowedTags: [] }))
          : [sanitizeHtml(keywords || '', { allowedTags: [] })],
        viewport: sanitizeHtml(viewport || '', { allowedTags: [] }),
        language: normalizeLanguage(language),
        isPdf,
        type: isPdf ? 'document' : 'article',
        wordCount,
        readingTime
      },

      documents: Array.isArray(documents) 
        ? documents
            .filter(doc => doc?.url && doc?.type)
            .slice(0, 20)
            .map(doc => ({
              url: sanitizeHtml(doc.url, { allowedTags: [] }),
              type: sanitizeHtml(doc.type.toLowerCase(), { allowedTags: [] })
            }))
        : [],

      status: 'active',
      version: 1,
      source: {
        ip: req.ip,
        userAgent: sanitizeHtml(userAgent || '', { allowedTags: [] }),
        extensionVersion: req.headers['x-extension-version']?.toString() || '1.0.0'
      },

      searchTokens: [
        ...(title?.toLowerCase().split(/\s+/) || []),
        ...(description?.toLowerCase().split(/\s+/) || [])
      ],

      references: Array.isArray(links)
        ? links
            .filter(link => link?.href)
            .slice(0, 100)
            .map(link => ({
              type: 'link',
              url: sanitizeHtml(link.href, { allowedTags: [] }),
              title: sanitizeHtml(link.text || '', { allowedTags: [] })
            }))
        : []
    };

    // 5. Save to Database
    const capture = await new Capture(captureData).save();
    console.log(capture);

    // 6. Response
    res.status(201).json({
      success: true,
      data: {
        id: capture._id,
        url: capture.url,
        title: capture.title,
        contentLength: capture.metadata.wordCount,
        documents: capture.documents?.length || 0, // Safe length access
        timestamp: capture.metadata.capturedAt
      }
    });

  } catch (error) {
    console.error('[CaptureController] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { 
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    });
  }
};




export const getCaptures = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const captures = await Capture.find()
      .sort({ timestamp: -1 })
      .populate("collection", "name")
      .exec();
    res.status(200).json(captures);
  } catch (error) {
    console.error("[LinkMeld] Error fetching captures:", error);
    res
      .status(500)
      .json({ message: "Error fetching captures", error: error.message });
  }
};

export const bookmarkOrUnbookmarkCapture = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { captureId } = req.params;

  if (!captureId) {
    res.status(400).json({
      message: "Invalid request. Please provide captureId and isBookmarked.",
    });
    return;
  }

  try {
    const capture = await Capture.findById(captureId);
    if (!capture) {
      res.status(404).json({ message: "Capture not found" });
      return;
    }

    capture.bookmarked = !capture.bookmarked;
    await capture.save();

    res.status(200).json({
      message: `Capture ${
        capture.bookmarked ? "bookmarked" : "unbookmarked"
      } successfully`,
      captureId: capture._id,
    });
  } catch (error) {
    console.error("[LinkMeld] Error bookmarking/unbookmarking capture:", error);
    res.status(500).json({
      message: "Error bookmarking/unbookmarking capture",
      error: error.message,
    });
  }
};

export const getBookmarkedCaptures = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const captures = await Capture.find({ bookmarked: true })
      .sort({ timestamp: -1 })
      .populate("collection", "name")
      .exec();
    res.status(200).json(captures);
  } catch (error) {
    console.error("[LinkMeld] Error fetching bookmarked captures:", error);
    res
      .status(500)
      .json({
        message: "Error fetching bookmarked captures",
        error: error.message,
      });
  }
};
