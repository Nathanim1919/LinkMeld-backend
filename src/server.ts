import 'dotenv/config';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import connectDB from './config/database';
import captureRoutes from './routes/captureRoutes';
import bodyParser from 'body-parser';

const app: Express = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Increase payload limit to 10MB
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type, Authorization',
}));
app.use(express.json());

// Routes
app.use('/api', captureRoutes);


// Start server
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
}); 