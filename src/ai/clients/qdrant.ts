import { QdrantClient } from "@qdrant/js-client-rest";

export const qdrant = new QdrantClient({
  url: "http://qdrant:6333", // internal Docker hostname
  timeout: 30000, // 30 seconds
});