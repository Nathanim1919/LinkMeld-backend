import mongoose, { Document, Schema, Types } from 'mongoose';
import { hashContent } from '../utils/hashing';
import { generateSlug } from '../utils/slugify';
import { normalizeUrl } from '../utils/urls';

// Type definitions for embedded documents
interface IContentHighlight {
  text: string;
  annotation?: string;
  position: [number, number]; // start/end offsets
  createdAt: Date;
  createdBy: Types.ObjectId;
}

interface IContentAttachment {
  type: 'pdf'|'image'|'video'|'spreadsheet'|'audio';
  url: string;
  thumbnail?: string;
  size: number;
  name?: string;
  metadata?: Record<string, any>;
}

/* Future: Entity Extraction
interface IMetadataEntity {
  text: string;
  type: 'person'|'place'|'organization'|'concept'|'event'|'product';
  relevance: number;
  metadata?: Record<string, any>;
}
*/

interface ICaptureReference {
  type: 'link'|'citation'|'embed'|'related';
  url?: string;
  title?: string;
  capture?: Types.ObjectId;
  position?: [number, number]; // For in-content anchoring
}

/* Future: AI Embeddings
interface IContentEmbedding {
  modelVersion: string;
  vector: number[];
  generatedAt: Date;
}
*/

// Main interface
export interface ICapture extends Omit<Document, 'collection'> {
  // ---- Core Identity ----
  owner?: Types.ObjectId;
  bookmarked?: boolean;
  workspace?: Types.ObjectId;
  collection?: Types.ObjectId;
  url: string;
  canonicalUrl?: string;
  title: string;
  slug: string;
  contentHash: string;

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
    /* Future: Categories
    categories?: string[];
    */
    /* Future: Sentiment Analysis
    sentiment?: {
      score: number; // -1 to 1
      magnitude: number;
    };
    */
    
    /* Future: NLP Entities
    entities: IMetadataEntity[];
    */
    
    // Technical
    isPdf: boolean;
    /* Future: Paywall Detection
    hasPaywall: boolean;
    requiresLogin: boolean;
    detectedTech?: string[];
    securityChecks?: {
      isMalicious?: boolean;
      isExpired?: boolean;
    };
    */
    
    // Temporal
    publishedAt?: Date;
    capturedAt: Date;
    /* Future: Content Updates
    updatedAt?: Date;
    expiresAt?: Date;
    */
    
    // Content Type
    type: 'article'|'document'|'product'|'discussion'|'code'|'other';
    /* Future: MIME Type
    contentType?: string;
    */
    
    // Current Metrics
    wordCount: number;
    readingTime: number;
  };

  /* Future: AI/ML Features
  ai?: {
    summary?: string;
    embeddings?: {
      content?: IContentEmbedding;
    };
    classifications?: {
      topic?: string;
    };
  };
  */

  // ---- Graph Relationships ----
  references: ICaptureReference[];
  /* Future: Backlinks
  backlinks?: Types.ObjectId[];
  */

  // ---- System ----
  status: 'active'|'archived'|'deleted';
  privacy: 'private'|'workspace'|'public';
  version: number;
  source: {
    ip?: string;
    userAgent?: string;
    extensionVersion: string;
    /* Future: Source Tracking
    via?: 'extension'|'api'|'cli'|'mobile';
    */
  };

  // ---- Indexing/Search ----
  searchTokens: string[];
  /* Future: Search Boosting
  searchBoost?: number;
  */

  // ---- Timestamps ----
  createdAt: Date;
  updatedAt: Date;
}

// Sub-schemas
const HighlightSchema = new Schema<IContentHighlight>({
  text: { type: String, required: true },
  annotation: String,
  position: { type: [Number], required: true },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const AttachmentSchema = new Schema<IContentAttachment>({
  type: { type: String, required: true, enum: ['pdf', 'image', 'video', 'spreadsheet', 'audio'] },
  url: { type: String, required: true },
  thumbnail: String,
  size: { type: Number, required: true }, // in bytes
  name: String,
  metadata: Object
}, { _id: false });

/* Future: Entity Schema
const EntitySchema = new Schema<IMetadataEntity>({
  text: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['person', 'place', 'organization', 'concept', 'event', 'product']
  },
  relevance: { type: Number, min: 0, max: 1 },
  metadata: Object
}, { _id: false });
*/

const ReferenceSchema = new Schema<ICaptureReference>({
  type: { 
    type: String, 
    required: true,
    enum: ['link', 'citation', 'embed', 'related']
  },
  url: String,
  title: String,
  capture: { type: Schema.Types.ObjectId, ref: 'Capture' },
  position: [Number]
}, { _id: false });

/* Future: Embedding Schema
const EmbeddingSchema = new Schema<IContentEmbedding>({
  modelVersion: { type: String, required: true },
  vector: { type: [Number], required: true },
  generatedAt: { type: Date, default: Date.now }
}, { _id: false });
*/

// Main schema
const CaptureSchema = new Schema<ICapture>({
  // ---- Core Identity ----
  owner: { 
    type: Types.ObjectId, 
    ref: 'User',
    required: true,
    index: true
  },
  workspace: { 
    type: Types.ObjectId, 
    ref: 'Workspace',
    index: true
  },
  bookmarked: {
    type: Boolean,
    default: false,
  },
  collection: { 
    type: Types.ObjectId, 
    ref: 'Collection',
    index: true
  },
  url: {
    type: String,
    required: true,
    validate: {
      validator: (v: string) => isValidUrl(v),
      message: 'Invalid URL format'
    },
    index: true
  },
  canonicalUrl: {
    type: String,
    validate: {
      validator: (v: string) => isValidUrl(v),
      message: 'Invalid URL format'
    }
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  slug: {
    type: String,
    unique: true,
    index: true
  },
  contentHash: {
    type: String,
    required: true,
    index: true
  },

  // ---- Content Storage ----
  content: {
    raw: { 
      type: String,
      select: false // Sensitive - only admins can access
    },
    clean: { 
      type: String, 
      required: true 
    },
    markdown: {
      type: String
    },
    highlights: {
      type: [HighlightSchema],
      default: []
    },
    attachments: {
      type: [AttachmentSchema],
      default: []
    }
  },

  // ---- Enhanced Metadata ----
  metadata: {
    description: {
      type: String,
      default: ''
    },
    favicon: String,
    siteName: String,
    language: {
      type: String,
      default: 'english', // Use generic language name instead of code
      enum: [
        'none', 'da', 'nl', 'english', 'fi', 'french', 
        'german', 'hungarian', 'italian', 'nb', 'pt', 
        'ro', 'ru', 'es', 'sv', 'tr'
      ] // Supported MongoDB text search languages
    },
    keywords: {
      type: [String],
      default: []
    },
    /* Future: Categories
    categories: [String],
    */
    /* Future: Sentiment Analysis
    sentiment: {
      score: Number,
      magnitude: Number
    },
    */
    /* Future: NLP Entities
    entities: {
      type: [EntitySchema],
      default: []
    },
    */
    isPdf: {
      type: Boolean,
      default: false
    },
    /* Future: Paywall Detection
    hasPaywall: {
      type: Boolean,
      default: false
    },
    requiresLogin: {
      type: Boolean,
      default: false
    },
    detectedTech: [String],
    securityChecks: {
      isMalicious: Boolean,
      isExpired: Boolean
    },
    */
    publishedAt: Date,
    capturedAt: {
      type: Date,
      default: Date.now
    },
    /* Future: Content Updates
    updatedAt: Date,
    expiresAt: Date,
    */
    type: {
      type: String,
      enum: ['article', 'document', 'product', 'discussion', 'code', 'other'],
      default: 'article'
    },
    /* Future: MIME Type
    contentType: String,
    */
    wordCount: {
      type: Number,
      default: 0
    },
    readingTime: {
      type: Number,
      default: 0
    }
  },

  /* Future: AI/ML Features
  ai: {
    summary: String,
    embeddings: {
      content: EmbeddingSchema
    },
    classifications: {
      topic: String
    }
  },
  */

  // ---- Graph Relationships ----
  references: {
    type: [ReferenceSchema],
    default: []
  },
  /* Future: Backlinks
  backlinks: [{
    type: Schema.Types.ObjectId,
    ref: 'Capture'
  }],
  */

  // ---- System ----
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active',
    index: true
  },
  privacy: {
    type: String,
    enum: ['private', 'workspace', 'public'],
    default: 'private',
    index: true
  },
  version: {
    type: Number,
    default: 1
  },
  source: {
    ip: String,
    userAgent: String,
    extensionVersion: {
      type: String,
      required: true
    }
    /* Future: Source Tracking
    via: {
      type: String,
      enum: ['extension', 'api', 'cli', 'mobile']
    }
    */
  },

  // ---- Indexing/Search ----
  searchTokens: {
    type: [String],
    index: 'text'
  }
  /* Future: Search Boosting
  searchBoost: {
    type: Number,
    default: 1.0
  }
  */
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
CaptureSchema.index({ 
  owner: 1, 
  status: 1,
  createdAt: -1 
});

CaptureSchema.index({
  title: 'text',
  'content.clean': 'text'
}, {
  name: 'content_search',
  weights: {
    title: 10,
    'content.clean': 3
  }
});

CaptureSchema.index({ 
  contentHash: 1,
  owner: 1 
}, { 
  unique: true 
});

// Middleware
CaptureSchema.pre<ICapture>('save', async function(next) {
  if (!this.slug) {
    this.slug = generateSlug(this.title);
  }

  if (this.isModified('url')) {
    this.canonicalUrl = this.canonicalUrl || normalizeUrl(this.url);
  }

  if (this.isModified('content.clean')) {
    this.contentHash = hashContent(this.content.clean);
    this.metadata.wordCount = countWords(this.content.clean);
    this.metadata.readingTime = calculateReadingTime(this.content.clean);
  }

  if (this.isModified('title') || this.isModified('content.clean')) {
    this.searchTokens = generateSearchTokens(this);
  }

  if (this.isNew) {
    this.version = 1;
  } else {
    this.version += 1;
  }

  next();
});

// Helper functions
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

function calculateReadingTime(text: string): number {
  const wpm = 200;
  return Math.ceil(countWords(text) / wpm);
}

function generateSearchTokens(capture: ICapture): string[] {
  const tokens = [
    ...(capture.title?.toLowerCase().split(/\s+/) || []),
    ...(capture.metadata.description?.toLowerCase().split(/\s+/) || [])
  ];
  
  /* Future: Entity Tokens
  if (capture.metadata.entities) {
    tokens.push(...capture.metadata.entities.map(e => e.text.toLowerCase()));
  }
  */
  
  return [...new Set(tokens)]; // Remove duplicates
}

// Export model
export const Capture = mongoose.model<ICapture>('Capture', CaptureSchema);