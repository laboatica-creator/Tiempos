"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Public routes
router.post('/register', auth_controller_1.registerUser);
router.post('/login', auth_controller_1.loginUser);
router.post('/forgot-password', auth_controller_1.forgotPassword);
router.post('/reset-password', auth_controller_1.resetPassword);
router.get('/franchises', auth_controller_1.getFranchises);
// Admin-only route example to register other admins/franchises
router.post('/register-staff', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requireRole)(['ADMIN', 'FRANCHISE']), auth_controller_1.registerUser);
exports.default = router;
