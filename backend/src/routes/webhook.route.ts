import { Router } from 'express';
import { processSinpeWebhook } from '../controllers/webhook.controller';

const router = Router();

// Webhook para proceso automático de SINPE vía OCR
router.post('/sinpe', processSinpeWebhook);

export default router;
