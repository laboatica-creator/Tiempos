import { Router } from 'express';
import { 
    getWalletBalance, 
    createSinpeRecharge, 
    approveRecharge, 
    rejectRecharge,
    getPendingRecharges,
    adjustWalletBalance,
    getPaymentMethods,
    addPaymentMethod,
    deletePaymentMethod,
    requestWithdrawal,
    getWalletHistory
} from '../controllers/wallet.controller';
import { authenticateJWT, requireRole, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

// Customer/Agent/Franchise routes
router.get('/balance', authenticateJWT, getWalletBalance);
router.post('/recharge', authenticateJWT, createSinpeRecharge);
router.post('/withdraw', authenticateJWT, requestWithdrawal);
router.get('/history', authenticateJWT, getWalletHistory);

// Payment Methods
router.get('/methods', authenticateJWT, getPaymentMethods);
router.post('/methods', authenticateJWT, addPaymentMethod);
router.delete('/methods/:methodId', authenticateJWT, deletePaymentMethod);

// Admin/Franchise routes
router.post('/recharge/:rechargeId/approve', authenticateJWT, requirePermission('recharges'), approveRecharge);
router.post('/recharge/:rechargeId/reject', authenticateJWT, requirePermission('recharges'), rejectRecharge);
router.post('/adjust', authenticateJWT, requirePermission('recharges'), adjustWalletBalance);
router.get('/pending', authenticateJWT, requirePermission('recharges'), getPendingRecharges);

export default router;
