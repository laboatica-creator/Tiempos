import { Router } from 'express';
import { handleWhatsAppWebhook } from '../controllers/whatsapp.controller';

const router = Router();

router.post('/webhook', handleWhatsAppWebhook);

export default router;
