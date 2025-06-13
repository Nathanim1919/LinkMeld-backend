import "dotenv/config";
import express, { Express } from "express";
import cors from "cors";
import connectDB from "./config/database";
import captureRoutes from "./routes/captureRoutes";
import folderRoutes from "./routes/folderRoute";
import bodyParser from "body-parser";
import sourceRoutes from "./routes/sourceRoute"; // Import source routes
const app: Express = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Increase payload limit to 10MB
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

// Middleware
app.use(
  cors({
    origin: "*", // Allow all origins for development
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Content-Type, Authorization",
  })
);
app.use(express.json());

// Routes
app.use("/api/v1/captures", captureRoutes);
app.use("/api/v1/folders", folderRoutes);
app.use("/api/v1/sources", sourceRoutes); // Use source routes

// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).send('Something broke!');
// });

// Start server
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
