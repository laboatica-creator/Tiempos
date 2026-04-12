import { Router } from 'express';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';
import {
    setWinningNumber,
    cancelDraw,
    getSuggestedResults
} from '../controllers/draw.controller';
import {
    getDashboardStats,
    getSystemSettings,
    updateSystemSettings
} from '../controllers/admin.controller';

const router = Router();

// ========== RUTAS DE SORTEOS ==========
router.post('/draws/set-winner', authenticateJWT, requirePermission('draws'), setWinningNumber);
router.post('/draws/cancel/:drawId', authenticateJWT, requirePermission('draws'), cancelDraw);
router.get('/draws/suggested-results', authenticateJWT, requirePermission('draws'), getSuggestedResults);

// ========== RUTAS DE REPORTES Y ESTADÍSTICAS ==========
router.get('/reports/dashboard', authenticateJWT, requirePermission('reports'), getDashboardStats);

// ========== RUTAS DE CONFIGURACIÓN ==========
router.get('/settings', authenticateJWT, requirePermission('settings'), getSystemSettings);
router.put('/settings', authenticateJWT, requirePermission('settings'), updateSystemSettings);

export default router;