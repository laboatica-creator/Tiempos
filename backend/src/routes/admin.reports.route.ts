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

router.use(authenticateJWT, requireRole(['ADMIN']));

router.get('/sales', getSalesReport);
router.get('/players', getPlayersReport);
router.get('/withdrawals', getWithdrawalsReport);
router.get('/sinpe-deposits', getSinpeDepositsReport);
router.get('/winners', getWinnersReport);
router.get('/dashboard', getDashboardReport);

export default router;
