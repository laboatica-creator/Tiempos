import { Router } from 'express';
import { 
    getDepositHistory, 
    getWinningsHistory, 
    getPaymentMethods, 
    addPaymentMethod, 
    deletePaymentMethod,
    requestWithdrawal
} from '../controllers/wallet.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// Financial history
router.get('/deposits', authenticateJWT, getDepositHistory);
router.get('/winnings', authenticateJWT, getWinningsHistory);

// Withdrawals
router.post('/withdrawals', authenticateJWT, requestWithdrawal);

// Payment Methods
router.get('/payment-methods', authenticateJWT, getPaymentMethods);
router.post('/payment-methods', authenticateJWT, addPaymentMethod);
router.delete('/payment-methods/:methodId', authenticateJWT, deletePaymentMethod);

// Note: Notifications and other user-specific data can be added here
// router.get('/notifications', authenticateJWT, getUserNotifications);

export default router;
