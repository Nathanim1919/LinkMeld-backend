import express from 'express';
import { saveCapture, getCaptures } from '../controllers/captureController';

const router = express.Router();

router.post('/save', saveCapture);
router.get('/', getCaptures);

export default router; 