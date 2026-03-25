"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const draw_controller_1 = require("../controllers/draw.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Public/Customer routes
router.get('/', auth_middleware_1.authenticateJWT, draw_controller_1.getDraws);
// Admin-only routes
router.post('/create', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requirePermission)('draws'), draw_controller_1.createDraw);
router.post('/:drawId/win', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requirePermission)('draws'), draw_controller_1.setWinningNumber);
router.post('/:drawId/cancel', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.requirePermission)('draws'), draw_controller_1.cancelDraw);
exports.default = router;
