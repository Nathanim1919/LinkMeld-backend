import dotenv from "dotenv";
dotenv.config();

import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";

// Use this instead of Mongoose for the adapter connection
// In your auth.ts
const mongo = new MongoClient(process.env.MONGO_URI! as string);
mongo.connect(); // Explicitly connect
const db = mongo.db();

export const auth = betterAuth({
  database: mongodbAdapter(db),
  trustedOrigins: [
    "http://localhost:5173", // Replace with your frontend's origin
    "https://your-production-domain.com", // Replace with your production domain
  ],
  secret: process.env.BETTER_AUTH_SECRET as string,
  baseUrl: "/api/auth",
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID as string,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET as string,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
});
