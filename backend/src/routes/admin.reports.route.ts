import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';
import { 
    getSalesReport, 
    getPlayersReport, 
    getWithdrawalsReport, 
    getSinpeDepositsReport, 
    getWinnersReport, 
    getDashboardReport 
} from '../controllers/admin.reports';

const router = Router();

// Todas las rutas requieren autenticación y rol ADMIN o FRANCHISE
router.use(authenticateJWT, requireRole(['ADMIN', 'FRANCHISE']));

router.get('/sales', getSalesReport);
router.get('/players', getPlayersReport);
router.get('/sinpe', getSinpeDepositsReport);
router.get('/withdrawals', getWithdrawalsReport);
router.get('/winnings', getWinnersReport);
router.get('/dashboard', getDashboardReport);

export default router;
