import { Document, Types } from "mongoose";

// Type definitions for embedded documents
export interface IContentHighlight {
  text: string;
  annotation?: string;
  position: [number, number]; // start/end offsets
  createdAt: Date;
  createdBy: Types.ObjectId;
}

export interface IContentAttachment {
  type: "pdf" | "image" | "video" | "spreadsheet" | "audio";
  url: string;
  thumbnail?: string;
  size: number;
  name?: string;
  metadata?: Record<string, any>;
}

export interface ICaptureReference {
  type: "link" | "citation" | "embed" | "related";
  url?: string;
  title?: string;
  capture?: Types.ObjectId;
  position?: [number, number]; // For in-content anchoring
}


export interface IHeadings {
    level: number; // 1-6
    text: string; // The heading text
}



// Main interface
export interface ICapture extends Omit<Document, "collection"> {
  // ---- Core Identity ----
  owner?: Types.ObjectId;
  bookmarked?: boolean;
  workspace?: Types.ObjectId;
  collection?: Types.ObjectId;
  url: string;
  canonicalUrl?: string;
  title: string;
  slug: string;
  headings?: IHeadings[]; // Array of headings with levels and text
  contentHash: string;
  conversation?: Types.ObjectId; // Reference to Conversation model

  // ---- Content Storage ----
  content: {
    raw: string;
    clean: string;
    markdown?: string;
    highlights: IContentHighlight[];
    attachments: IContentAttachment[];
  };

  // ---- Enhanced Metadata ----
  metadata: {
    // Basic
    description: string;
    favicon?: string;
    siteName?: string;
    language?: string;

    // Content Analysis
    keywords: string[];

    // Technical
    isPdf: boolean;
    // Temporal
    publishedAt?: Date;
    capturedAt: Date;

    // Content Type
    type: "article" | "document" | "product" | "discussion" | "code" | "other";

    // Current Metrics
    wordCount: number;
    readingTime: number;
  };

  // Future: AI/ML Features
  ai: {
    summary?: string;
    embeddings?: number[]; // Placeholder for future embeddings
  };

  // ---- Graph Relationships ----
  references: ICaptureReference[];

  // ---- System ----
  status: "active" | "archived" | "deleted";
  privacy: "private" | "workspace" | "public";
  version: number;
  source: {
    ip?: string;
    userAgent?: string;
    extensionVersion: string;
  };

  // ---- Timestamps ----
  createdAt: Date;
  updatedAt: Date;
}
