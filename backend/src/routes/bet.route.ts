import { Router } from 'express';
import { placeBet, getNumberExposure, getUserBets, cancelBet } from '../controllers/bet.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// Get player's personal betting history
router.get('/', authenticateJWT, getUserBets);

// Place a bet ticket (multiple numbers at once)
router.post('/place', authenticateJWT, placeBet);

// Get real-time heat-map exposure for a specific draw
router.get('/exposure/:draw_id', authenticateJWT, getNumberExposure);

// Cancel a bet (Refunds money)
router.post('/cancel/:betId', authenticateJWT, cancelBet);

export default router;
