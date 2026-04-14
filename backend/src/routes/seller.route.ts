import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';
import { 
    getActiveDraws, 
    createCashBet, 
    getTodaySales, 
    getSalesHistory,
    getTicketData
} from '../controllers/seller.controller';

const router = Router();

// Todas las rutas requieren autenticación y rol SELLER
router.use(authenticateJWT);
router.use(requireRole(['SELLER']));

// Sorteos activos
router.get('/draws', getActiveDraws);

// Apuesta en efectivo
router.post('/cash-bet', createCashBet);

// Ventas del día
router.get('/today-sales', getTodaySales);

// Historial de ventas
router.get('/sales-history', getSalesHistory);

// Obtener datos del ticket para imprimir
router.get('/ticket/:betId', getTicketData);

export default router;