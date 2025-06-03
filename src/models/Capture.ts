import mongoose, { Schema, Document } from 'mongoose';

export interface ICapture extends Document {
  url: string;
  timestamp: Date;
  metadata: {
    title: string;
    description: string;
    url: string;
    favicon: string;
  };
  mainText: string;
  images: { url: string; alt: string }[];
  links: { href: string; text: string }[];
  documents: { url: string; type: string }[];
  interactiveForms: { action: string; method: string; inputs: { type: string; name: string; value: string }[] }[];
}

const CaptureSchema: Schema = new Schema({
  url: { type: String, required: true },
  timestamp: { type: Date, required: true },
  metadata: {
    title: { type: String, default: 'Untitled' },
    description: { type: String, default: '' },
    url: { type: String, default: '' },
    favicon: { type: String, default: '' },
  },
  mainText: { type: String, required: true },
  images: [{ url: { type: String }, alt: { type: String } }],
  links: [{ href: { type: String }, text: { type: String } }],
  documents: [{ url: { type: String }, type: { type: String } }],
  interactiveForms: [{
    action: { type: String },
    method: { type: String },
    inputs: [{
      type: { type: String },
      name: String,
      value: String,
    }],
  }],
});
 
CaptureSchema.index({ url: 1, timestamp: -1 });
CaptureSchema.index({ 'metadata.title': 'text', mainText: 'text' });

export default mongoose.model<ICapture>('Capture', CaptureSchema);