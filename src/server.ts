import "dotenv/config";
import express, { Express } from "express";
import cors from "cors";
import { connectMongo } from "./config/database";
import captureRoutes from "./routes/captureRoutes";
import folderRoutes from "./routes/folderRoute";
import sourceRoutes from "./routes/sourceRoute"; // Import source routes
import { auth } from "./lib/auth";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
connectMongo();

// Increase payload limit to 10MB
// app.use(bodyParser.json({ limit: "10mb" }));
// app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

// Configure CORS middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  })
);

app.all("/api/auth/*splat", (req: Request, res: Response, next: Function) => {
  console.log("Auth request:", req.method, req.url);
  toNodeHandler(auth)(req, res);
});

app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.use(express.json());

// Routes
app.use("/api/v1/captures", captureRoutes);
app.use("/api/v1/folders", folderRoutes);
app.use("/api/v1/sources", sourceRoutes); // Use source routes

app.get("/api/me", async (req: Request, res: Response) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  res.json(session);
});

// Start server
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
