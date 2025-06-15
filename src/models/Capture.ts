import mongoose, { Schema, Document } from 'mongoose';

export interface ICapture extends Document {
  // user: mongoose.Types.ObjectId;
  folder?: mongoose.Types.ObjectId;
  bookmarked?: boolean;
  url: string;
  title: string;
  summary: string;
  timestamp: Date;
  metadata: {
    title: string;
    description: string;
    favicon: string;
    siteName: string;
    publishedTime: string;
    author: string;
    keywords: string;
    viewport: string;
    extractionMethod: string;
    isPdf: boolean;
  };
  mainText: string;
  documents: { url: string; type: string }[];
  tags: string[];
  pinned: boolean;
  archived: boolean;
  metrics: {
    contentExtraction: number;
    documentExtraction: number;
    metadataExtraction: number;
    totalTime: number;
    textLength: number;
    documentCount: number;
  };
}

const CaptureSchema: Schema = new Schema({
  folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder' },
  url: { type: String, required: true },
  title: { type: String, default: 'Untitled' },
  summary: { type: String, default: '' },
  timestamp: { type: Date, required: true },
  bookmarked: { type: Boolean, default: false },
  metadata: {
    title: { type: String, default: 'Untitled' },
    description: { type: String, default: '' },
    favicon: { type: String, default: '' },
    siteName: { type: String, default: '' },
    publishedTime: { type: String, default: '' },
    author: { type: String, default: '' },
    keywords: { type: String, default: '' },
    viewport: { type: String, default: '' },
    extractionMethod: { type: String, default: 'unknown' },
    isPdf: { type: Boolean, default: false },
  },

  mainText: { type: String, default: '' },
  documents: [{
    url: { type: String },
    type: { type: String },
  }],
  tags: [{ type: String }],
  pinned: { type: Boolean, default: false },
  archived: { type: Boolean, default: false },

  metrics: {
    contentExtraction: { type: Number, default: 0 },
    documentExtraction: { type: Number, default: 0 },
    metadataExtraction: { type: Number, default: 0 },
    totalTime: { type: Number, default: 0 },
    textLength: { type: Number, default: 0 },
    documentCount: { type: Number, default: 0 },
  },
});

CaptureSchema.index({ user: 1, folder: 1, timestamp: -1 });
CaptureSchema.index({ title: 'text', mainText: 'text', 'metadata.title': 'text' });

export default mongoose.model<ICapture>('Capture', CaptureSchema);
