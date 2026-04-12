import { Router } from 'express';
import { authenticateJWT, requirePermission } from '../middlewares/auth.middleware';
import {
    setWinningNumber,
    cancelDraw,
    getSuggestedResults,
    getDraws
} from '../controllers/draw.controller';
import {
    getDashboardStats,
    getReports,
    getSystemSettings,
    updateSystemSettings
} from '../controllers/admin.controller';

const router = Router();

// ========== RUTAS DE SORTEOS ==========
// Registrar número ganador
router.post('/draws/set-winner', authenticateJWT, requirePermission('draws'), setWinningNumber);

// Cancelar sorteo
router.post('/draws/cancel/:drawId', authenticateJWT, requirePermission('draws'), cancelDraw);

// Obtener resultados sugeridos (scraping)
router.get('/draws/suggested-results', authenticateJWT, requirePermission('draws'), getSuggestedResults);

// Obtener sorteos
router.get('/draws', authenticateJWT, requirePermission('draws'), getDraws);

// ========== RUTAS DE REPORTES Y ESTADÍSTICAS ==========
// Estadísticas del dashboard
router.get('/reports/dashboard', authenticateJWT, requirePermission('reports'), getDashboardStats);

// Reportes generales
router.get('/reports', authenticateJWT, requirePermission('reports'), getReports);

// ========== RUTAS DE CONFIGURACIÓN ==========
// Obtener configuración del sistema
router.get('/settings', authenticateJWT, requirePermission('settings'), getSystemSettings);

// Actualizar configuración del sistema
router.put('/settings', authenticateJWT, requirePermission('settings'), updateSystemSettings);

export default router;