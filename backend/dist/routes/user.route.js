"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wallet_controller_1 = require("../controllers/wallet.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Financial history
router.get('/deposits', auth_middleware_1.authenticateJWT, wallet_controller_1.getDepositHistory);
router.get('/winnings', auth_middleware_1.authenticateJWT, wallet_controller_1.getWinningsHistory);
// Withdrawals
router.post('/withdrawals', auth_middleware_1.authenticateJWT, wallet_controller_1.requestWithdrawal);
// Payment Methods
router.get('/payment-methods', auth_middleware_1.authenticateJWT, wallet_controller_1.getPaymentMethods);
router.post('/payment-methods', auth_middleware_1.authenticateJWT, wallet_controller_1.addPaymentMethod);
router.delete('/payment-methods/:methodId', auth_middleware_1.authenticateJWT, wallet_controller_1.deletePaymentMethod);
// Note: Notifications and other user-specific data can be added here
// router.get('/notifications', authenticateJWT, getUserNotifications);
exports.default = router;
