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
import { getUserProfile, updateUserProfile } from '../controllers/user.controller';

const router = Router();

// 🔥 Perfil de usuario
router.get('/profile', authenticateJWT, getUserProfile);
router.put('/profile', authenticateJWT, updateUserProfile);

// Financial history
router.get('/deposits', authenticateJWT, getDepositHistory);
router.get('/winnings', authenticateJWT, getWinningsHistory);

// Withdrawals
router.post('/withdrawals', authenticateJWT, requestWithdrawal);

// Payment Methods
router.get('/payment-methods', authenticateJWT, getPaymentMethods);
router.post('/payment-methods', authenticateJWT, addPaymentMethod);
router.delete('/payment-methods/:methodId', authenticateJWT, deletePaymentMethod);

export default router;