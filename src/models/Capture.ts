import mongoose, { Document, Schema } from 'mongoose';

export interface ICapture extends Document {
  url: string;
  timestamp: Date;
  text: string;
  html: string;
  createdAt: Date;
  updatedAt: Date;
}

const CaptureSchema: Schema = new Schema({
  url: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  html: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model<ICapture>('Capture', CaptureSchema); 