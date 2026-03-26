"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const wallet_controller_1 = require("../controllers/wallet.controller");
const backup_controller_1 = require("../controllers/backup.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get('/stats', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN', 'FRANCHISE']), admin_controller_1.getDashboardStats);
router.get('/transactions', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN', 'FRANCHISE']), admin_controller_1.getRecentTransactions);
router.get('/exposure/:lotteryType', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN', 'FRANCHISE']), admin_controller_1.getRiskExposure);
router.get('/users', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requirePermission)('players'), admin_controller_1.getAllPlayers);
router.put('/users/:id', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requirePermission)('players'), admin_controller_1.updatePlayer);
router.delete('/users/:id', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requirePermission)('players'), admin_controller_1.deletePlayer);
router.put('/promote-franchise/:id', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN']), admin_controller_1.promoteToFranchise);
// Deposits/Recharges
router.get('/deposits', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requirePermission)('recharges'), wallet_controller_1.getPendingRecharges);
router.post('/deposits/:rechargeId/approve', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requirePermission)('recharges'), wallet_controller_1.approveRecharge);
// Withdrawals
router.get('/withdrawals', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requirePermission)('recharges'), wallet_controller_1.getPendingWithdrawals);
router.post('/withdrawals/:withdrawalId/process', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requirePermission)('recharges'), wallet_controller_1.approveWithdrawal);
// Wallets
router.post('/wallets/adjust', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requirePermission)('recharges'), wallet_controller_1.adjustWalletBalance);
// Settings
router.get('/settings', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN']), admin_controller_1.getSystemSettings);
router.post('/settings', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN']), admin_controller_1.updateSystemSettings);
// Admin-only franchise management
router.get('/franchises', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN']), admin_controller_1.getAllFranchises);
router.delete('/franchises/:id', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN']), admin_controller_1.deleteFranchise);
// Admin User Management (Master Admin only)
router.get('/admins', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN']), admin_controller_1.getAdmins);
router.post('/admins', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN']), admin_controller_1.createAdmin);
router.put('/admins/:id', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN']), admin_controller_1.updateAdminPermissions);
// Database Backup & Restore
router.post('/backup/export', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN']), backup_controller_1.exportDatabase);
router.post('/backup/import', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN']), backup_controller_1.importDatabase);
exports.default = router;
