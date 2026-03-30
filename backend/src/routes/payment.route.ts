import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';
import { getPaymentMethods, addPaymentMethod, removePaymentMethod, getCards, addCard, deleteCard } from '../controllers/payment.controller';

const router = Router();

// Public / User read routes
router.get('/', getPaymentMethods);

// User card routes
router.get('/cards', authenticateJWT, getCards);
router.post('/cards', authenticateJWT, addCard);
router.delete('/cards/:id', authenticateJWT, deleteCard);

// Admin only payment method routes
router.post('/', authenticateJWT, requireRole(['ADMIN']), addPaymentMethod);
router.delete('/:id', authenticateJWT, requireRole(['ADMIN']), removePaymentMethod);

export default router;
