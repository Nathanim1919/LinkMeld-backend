import "dotenv/config";
import express, { Express } from "express";
import cors from "cors";
import captureRoutes from "./routes/captureRoutes";
import collectionRoutes from "./routes/collectionRoute";
import sourceRoutes from "./routes/sourceRoute"; // Import source routes
import { userProfileRoutes } from "./routes/userRoute";
import aiChatRoutes from "./routes/chatRoutes";
import feedbackRoutes from "./routes/feedbackRoutes";
import waitlistRoutes from "./routes/waitlistRoute";
import { auth } from "../lib/auth";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { Request, Response } from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { connectMongo } from "../common/config/database";
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
connectMongo();

// Increase payload limit to 10MB

// Configure CORS middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://deepen.live",
      "https://www.deepen.live",
      "https://deepen-ten.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

app.all("/api/auth/*splat", (req: Request, res: Response) => {
  toNodeHandler(auth)(req, res);
});

// ✅ Correct: Use built-in express middleware with limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// You can remove the 'import bodyParser' and 'app.use(bodyParser...)' lines entirely.
// Routes
app.use("/api/v1/captures", captureRoutes);
app.use("/api/v1/folders", collectionRoutes);
app.use("/api/v1/sources", sourceRoutes); // Use source routes
app.use("/api/v1/account", userProfileRoutes);
app.use("/api/v1/ai", aiChatRoutes);
app.use("/api/v1/feedback", feedbackRoutes);
app.use("/api/v1/waitlist", waitlistRoutes);

app.get("/api/me", async (req: Request, res: Response) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  res.json(session);
});

app.get("/api/health", (_: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Server is healthy" });
});

// Start server
app.listen(port, "0.0.0.0", () => {
  console.log(`⚡️[server]: Server is running on port ${port}`);
  console.log(
    `Public URL: ${process.env.PUBLIC_URL || "https://deepen-api.onrender.com"}`,
  );
});
