import { Router } from 'express';
import { handleWhatsAppWebhook, getWebhookHealth } from '../controllers/whatsapp.controller';

const router = Router();

router.get('/health', getWebhookHealth);
router.post('/webhook', handleWhatsAppWebhook);

export default router;
