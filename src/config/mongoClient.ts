// src/db.ts or src/lib/mongodb.ts
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
export const client = new MongoClient(uri);

(async () => {
  await client.connect();
})();
