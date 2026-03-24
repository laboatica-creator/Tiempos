"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wallet_controller_1 = require("../controllers/wallet.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Customer/Agent/Franchise routes
router.get('/balance', auth_middleware_1.authenticateJWT, wallet_controller_1.getWalletBalance);
router.post('/recharge', auth_middleware_1.authenticateJWT, wallet_controller_1.createSinpeRecharge);
// Payment Methods
router.get('/methods', auth_middleware_1.authenticateJWT, wallet_controller_1.getPaymentMethods);
router.post('/methods', auth_middleware_1.authenticateJWT, wallet_controller_1.addPaymentMethod);
router.delete('/methods/:methodId', auth_middleware_1.authenticateJWT, wallet_controller_1.deletePaymentMethod);
// Admin/Franchise routes
router.post('/recharge/:rechargeId/approve', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN', 'FRANCHISE']), wallet_controller_1.approveRecharge);
router.post('/adjust', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN', 'FRANCHISE']), wallet_controller_1.adjustWalletBalance);
router.get('/pending', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN', 'FRANCHISE']), wallet_controller_1.getPendingRecharges);
exports.default = router;
