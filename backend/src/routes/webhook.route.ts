import { Router } from 'express';
import { processSinpeWebhook } from '../controllers/webhook.controller';

const router = Router();

router.post('/sinpe', processSinpeWebhook);

export default router;