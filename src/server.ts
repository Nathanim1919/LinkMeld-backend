import "dotenv/config";
import express, { Express } from "express";
import cors from "cors";
import connectDB from "./config/database";
import captureRoutes from "./routes/captureRoutes";
import folderRoutes from "./routes/folderRoute";
import bodyParser from "body-parser";
import sourceRoutes from "./routes/sourceRoute"; // Import source routes
import { auth } from "./lib/auth";
import { toNodeHandler } from "better-auth/node";

const app: Express = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Increase payload limit to 10MB
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

// Middleware to handle authentication
app.all("/api/auth/*splat", toNodeHandler(auth));

// Configure CORS middleware
app.use(
  cors({
    origin: "http://localhost:5173", // Replace with your frontend's origin
    methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  })
);
app.use(express.json());

// Routes
app.use("/api/v1/captures", captureRoutes);
app.use("/api/v1/folders", folderRoutes);
app.use("/api/v1/sources", sourceRoutes); // Use source routes

// Start server
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
