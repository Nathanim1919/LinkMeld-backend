import Bull from 'bull';
import * as pdfjsLib from 'pdfjs-dist';
import axios from 'axios';
import Capture from '../models/Capture';

const documentQueue = new Bull('document-processing', {
  redis: { host: 'localhost', port: 6379 },
});

documentQueue.process(async (job) => {
  const { captureId, documents } = job.data;
  console.log('[LinkMeld] Processing documents for capture:', captureId);

  try {
    const capture = await Capture.findById(captureId);
    if (!capture) {
      throw new Error('Capture not found');
    }

    const processedDocs = [];

    for (const doc of documents) {
      if (doc.type === 'pdf') {
        try {
          const response = await axios.get(doc.url, { responseType: 'arraybuffer' });
          const pdf = await pdfjsLib.getDocument({ data: response.data }).promise;
          let text = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ') + '\n';
          }
          processedDocs.push({ url: doc.url, type: 'pdf', text });
        } catch (err) {
          console.error('[LinkMeld] Error processing PDF:', doc.url, err);
          processedDocs.push({ url: doc.url, type: 'pdf', text: '' });
        }
      } else if (doc.type === 'doc') {
        console.log('[LinkMeld] DOC processing not implemented:', doc.url);
        processedDocs.push({ url: doc.url, type: 'doc', text: '' });
      }
    }

    capture.processedDocuments = processedDocs;
    await capture.save();

    console.log('[LinkMeld] Documents processed for capture:', captureId);
  } catch (error) {
    console.error('[LinkMeld] Error in document processor:', error);
  }
});

console.log('[LinkMeld] Document processing worker started');