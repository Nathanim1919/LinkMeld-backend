import "dotenv/config";
import express, { Express } from "express";
import cors from "cors";
import captureRoutes from "./routes/captureRoutes";
import collectionRoutes from "./routes/collectionRoute";
import sourceRoutes from "./routes/sourceRoute";
import { userProfileRoutes } from "./routes/userRoute";
import aiChatRoutes from "./routes/chatRoutes";
import feedbackRoutes from "./routes/feedbackRoutes";
import waitlistRoutes from "./routes/waitlistRoute";
import { auth } from "../lib/auth";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { Request, Response } from "express";
import dotenv from "dotenv";
import { connectMongo } from "../common/config/database";

dotenv.config();

const app: Express = express();

// Prefer the platform-provided PORT; fallback to 3000 for local dev
const port = Number(process.env.PORT) || 3000;
// Prefer the platform-provided HOST; bind to 0.0.0.0 by default so health checks can reach the process
const host = process.env.HOST || "0.0.0.0";

// Connect to MongoDB (keep this early so routes that require DB have it)
connectMongo();

// Configure middleware
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

// Body parsing with increased limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// API routes
app.use("/api/v1/captures", captureRoutes);
app.use("/api/v1/folders", collectionRoutes);
app.use("/api/v1/sources", sourceRoutes);
app.use("/api/v1/account", userProfileRoutes);
app.use("/api/v1/ai", aiChatRoutes);
app.use("/api/v1/feedback", feedbackRoutes);
app.use("/api/v1/waitlist", waitlistRoutes);

// Health endpoints (platforms often expect a root-level /health)
app.get("/health", (_: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Server is healthy" });
});
app.get("/api/health", (_: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Server is healthy" });
});
app.get("/api/v1/health", (_: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Server is healthy" });
});

// Example protected session route using the same auth helper
app.get("/api/me", async (req: Request, res: Response) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  res.json(session);
});

// Log effective environment values for debugging deploy / health-check mismatches
console.log("Effective environment values:");
console.log("  NODE_ENV:", process.env.NODE_ENV || "undefined");
console.log("  PORT (env):", process.env.PORT || "undefined");
console.log("  Resolved port:", port);
console.log("  HOST (env):", process.env.HOST || "undefined");
console.log("  Resolved host:", host);

// Start server bound to host so platform health checks can reach it
app.listen(port, host, () => {
  console.log(`⚡️[server]: Server is running at http://${host}:${port}`);
});
