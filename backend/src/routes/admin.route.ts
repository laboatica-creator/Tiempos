import { Router } from 'express';
import { 
    getDashboardStats, 
    getRecentTransactions, 
    getAllPlayers, 
    updatePlayer, 
    deletePlayer,
    getRiskExposure,
    getAllFranchises, 
    deleteFranchise,
    getAdmins,
    createAdmin,
    updateAdminPermissions,
    promoteToFranchise,
    getSystemSettings,
    updateSystemSettings,
    getSalesReport
} from '../controllers/admin.controller';
import { approveRecharge, rejectRecharge, getPendingRecharges, adjustWalletBalance, getPendingWithdrawals, approveWithdrawal } from '../controllers/wallet.controller';
import { exportDatabase, importDatabase } from '../controllers/backup.controller';
import { authenticateJWT, requireRole, requirePermission } from '../middlewares/auth.middleware';
import { setWinningNumber, cancelDraw, getSuggestedResults, liquidateDraw } from '../controllers/draw.controller';

// Controladores de vendedores unificados
import { 
    getSellers,
    getSellerDetail,
    payPrize,
    liquidatePeriod,
    toggleSellerStatus
} from '../controllers/admin-seller.controller';

const router = Router();

router.get('/stats', authenticateJWT, requireRole(['ADMIN', 'FRANCHISE']), getDashboardStats);
router.get('/stats/report', authenticateJWT, requireRole(['ADMIN', 'FRANCHISE']), getSalesReport);
router.get('/transactions', authenticateJWT, requireRole(['ADMIN', 'FRANCHISE']), getRecentTransactions);
router.get('/exposure/:lotteryType', authenticateJWT, requireRole(['ADMIN', 'FRANCHISE']), getRiskExposure);
router.get('/users', authenticateJWT, requirePermission('players'), getAllPlayers);
router.put('/users/:id', authenticateJWT, requirePermission('players'), updatePlayer);
router.delete('/users/:id', authenticateJWT, requirePermission('players'), deletePlayer);
router.put('/promote-franchise/:id', authenticateJWT, requireRole(['ADMIN']), promoteToFranchise);

// Deposits/Recharges
router.get('/deposits', authenticateJWT, requirePermission('recharges'), getPendingRecharges);
router.post('/deposits/:rechargeId/approve', authenticateJWT, requirePermission('recharges'), approveRecharge);
router.post('/deposits/:rechargeId/reject', authenticateJWT, requirePermission('recharges'), rejectRecharge);

// Withdrawals
router.get('/withdrawals', authenticateJWT, requirePermission('recharges'), getPendingWithdrawals);
router.post('/withdrawals/:withdrawalId/process', authenticateJWT, requirePermission('recharges'), approveWithdrawal);

// Wallets
router.post('/wallets/adjust', authenticateJWT, requirePermission('recharges'), adjustWalletBalance);

// Settings
router.get('/settings', authenticateJWT, getSystemSettings);
router.post('/settings', authenticateJWT, requireRole(['ADMIN']), updateSystemSettings);

// Admin-only franchise management
router.get('/franchises', authenticateJWT, requireRole(['ADMIN']), getAllFranchises);
router.delete('/franchises/:id', authenticateJWT, requireRole(['ADMIN']), deleteFranchise);

// Admin User Management (Master Admin only)
router.get('/admins', authenticateJWT, requireRole(['ADMIN']), getAdmins);
router.post('/admins', authenticateJWT, requireRole(['ADMIN']), createAdmin);
router.put('/admins/:id', authenticateJWT, requireRole(['ADMIN']), updateAdminPermissions);

// Database Backup & Restore
router.post('/backup/export', authenticateJWT, requireRole(['ADMIN']), exportDatabase);
router.post('/backup/import', authenticateJWT, requireRole(['ADMIN']), importDatabase);

// ========== RUTAS DE SORTEOS ==========
router.post('/draws/set-winner/:drawId', authenticateJWT, requirePermission('draws'), setWinningNumber);
router.post('/draws/cancel/:drawId', authenticateJWT, requirePermission('draws'), cancelDraw);
router.post('/draws/liquidate', authenticateJWT, requirePermission('draws'), liquidateDraw);
router.get('/draws/suggested-results', authenticateJWT, requirePermission('draws'), getSuggestedResults);

// ==================== RUTAS DE VENDEDORES (SINCRONIZADAS) ====================
router.get('/sellers', authenticateJWT, requireRole(['ADMIN', 'FRANCHISE']), getSellers);
router.get('/sellers/:id/detail', authenticateJWT, requireRole(['ADMIN', 'FRANCHISE']), getSellerDetail);
router.post('/sellers/:id/toggle-status', authenticateJWT, requireRole(['ADMIN', 'FRANCHISE']), toggleSellerStatus);

// ==================== RUTAS DE LIQUIDACIONES Y PAGOS ====================
router.post('/sellers/liquidate', authenticateJWT, requireRole(['ADMIN', 'FRANCHISE']), liquidatePeriod);
router.post('/sellers/pay-prize/:betId', authenticateJWT, requireRole(['ADMIN', 'FRANCHISE']), payPrize);

export default router;