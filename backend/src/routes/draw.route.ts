import { Router } from 'express';
import { createDraw, setWinningNumber, getDraws, cancelDraw, getDrawSuggestions } from '../controllers/draw.controller';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

// Public/Customer routes
router.get('/', authenticateJWT, getDraws);

// Admin-only routes
router.get('/suggestions', authenticateJWT, requirePermission('draws'), getDrawSuggestions);
router.post('/create', authenticateJWT, requirePermission('draws'), createDraw);
router.post('/:drawId/win', authenticateJWT, requirePermission('draws'), setWinningNumber);
router.post('/:drawId/cancel', authenticateJWT, requirePermission('draws'), cancelDraw);

export default router;
