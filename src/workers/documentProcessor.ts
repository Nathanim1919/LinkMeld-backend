// import Bull from 'bull';
// import * as pdfjsLib from 'pdfjs-dist';
// import axios from 'axios';

// const documentQueue = new Bull('document-processing', {
//   redis: { host: 'localhost', port: 6379 },
// });

// documentQueue.process(async (job) => {
//   const { captureId, documents } = job.data;

//   try {
//     const capture = await Capture.findById(captureId);
//     if (!capture) {
//       throw new Error('Capture not found');
//     }

//     const processedDocs = [];

//     for (const doc of documents) {
//       if (doc.type === 'pdf') {
//         try {
//           const response = await axios.get(doc.url, { responseType: 'arraybuffer' });
//           const pdf = await pdfjsLib.getDocument({ data: response.data }).promise;
//           let text = '';
//           for (let i = 1; i <= pdf.numPages; i++) {
//             const page = await pdf.getPage(i);
//             const content = await page.getTextContent();
//             text += content.items.map(item => item.str).join(' ') + '\n';
//           }
//           processedDocs.push({ url: doc.url, type: 'pdf', text });
//         } catch (err) {
//           console.error('[LinkMeld] Error processing PDF:', doc.url, err);
//           processedDocs.push({ url: doc.url, type: 'pdf', text: '' });
//         }
//       } else if (doc.type === 'doc') {
//         processedDocs.push({ url: doc.url, type: 'doc', text: '' });
//       }
//     }

//     capture.processedDocuments = processedDocs;
//     await capture.save();

//   } catch (error) {
//     console.error('[LinkMeld] Error in document processor:', error);
//   }
// });
