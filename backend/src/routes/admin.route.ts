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
    updateAdminPermissions
} from '../controllers/admin.controller';
import { exportDatabase, importDatabase } from '../controllers/backup.controller';
import { authenticateJWT, requireRole, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/stats', authenticateJWT, requireRole(['ADMIN', 'FRANCHISE']), getDashboardStats);
router.get('/transactions', authenticateJWT, requireRole(['ADMIN', 'FRANCHISE']), getRecentTransactions);
router.get('/exposure/:lotteryType', authenticateJWT, requireRole(['ADMIN', 'FRANCHISE']), getRiskExposure);
router.get('/users', authenticateJWT, requirePermission('players'), getAllPlayers);
router.put('/users/:id', authenticateJWT, requirePermission('players'), updatePlayer);
router.delete('/users/:id', authenticateJWT, requirePermission('players'), deletePlayer);

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

export default router;
