"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get('/stats', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN', 'FRANCHISE']), admin_controller_1.getDashboardStats);
router.get('/transactions', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN', 'FRANCHISE']), admin_controller_1.getRecentTransactions);
router.get('/exposure/:lotteryType', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN', 'FRANCHISE']), admin_controller_1.getRiskExposure);
router.get('/users', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN', 'FRANCHISE']), admin_controller_1.getAllPlayers);
router.put('/users/:id', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN', 'FRANCHISE']), admin_controller_1.updatePlayer);
router.delete('/users/:id', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN', 'FRANCHISE']), admin_controller_1.deletePlayer);
// Admin-only franchise management
router.get('/franchises', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN']), admin_controller_1.getAllFranchises);
router.delete('/franchises/:id', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN']), admin_controller_1.deleteFranchise);
exports.default = router;
