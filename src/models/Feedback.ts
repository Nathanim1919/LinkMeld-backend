import mongoose from "mongoose";

interface IFeedback {
  feedback: string;
  name?: string;
  profession?: string;
  createdAt?: Date;
}

const FeedbackSchema = new mongoose.Schema<IFeedback>({
  feedback: {
    type: String,
    required: true,
    trim: true,
  },
  name: {
    type: String,
    trim: true,
    default: "Anonymous",
  },
  profession: {
    type: String,
    trim: true,
    default: "Unknown",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Feedback = mongoose.model("Feedback", FeedbackSchema);
export default Feedback;
