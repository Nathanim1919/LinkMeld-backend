import 'dotenv/config';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import connectDB from './config/database';
import captureRoutes from './routes/captureRoutes';

const app: Express = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', captureRoutes);

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to LinkMeld API' });
});

// Start server
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
}); 