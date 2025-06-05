// import Bull from 'bull';
// import Capture from '../models/Capture';
// import { HuggingFaceTransformersEmbeddings } from 'langchain/embeddings/hf_transformers';

// const embeddingQueue = new Bull('embedding-generation', {
//   redis: { host: 'localhost', port: 6379 },
// });

// const embeddings = new HuggingFaceTransformersEmbeddings({
//   model: 'sentence-transformers/all-MiniLM-L6-v2',
// });

// embeddingQueue.process(async (job) => {
//   const { captureId, textChunks } = job.data;
//   console.log('[LinkMeld] Generating embeddings for capture:', captureId);

//   try {
//     const capture = await Capture.findById(captureId);
//     if (!capture) {
//       throw new Error('Capture not found');
//     }

//     // Generate embeddings
//     const vectors = await embeddings.embedDocuments(textChunks);

//     // Update textChunks with embeddings
//     capture.textChunks = capture.textChunks.map((chunk, i) => ({
//       content: chunk.content,
//       embedding: vectors[i],
//     }));

//     await capture.save();

//     // TODO: Store embeddings in Pinecone/Weaviate
//     console.log('[LinkMeld] Embeddings generated for capture:', captureId);
//   } catch (error) {
//     console.error('[LinkMeld] Error in embedding processor:', error);
//   }
// });

// console.log('[LinkMeld] Embedding processing worker started');