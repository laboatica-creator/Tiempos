"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bet_controller_1 = require("../controllers/bet.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Get player's personal betting history
router.get('/my', auth_middleware_1.authenticateJWT, bet_controller_1.getUserBets);
// Place a bet ticket (multiple numbers at once)
router.post('/place', auth_middleware_1.authenticateJWT, bet_controller_1.placeBet);
// Get real-time heat-map exposure for a specific draw
router.get('/exposure/:draw_id', auth_middleware_1.authenticateJWT, bet_controller_1.getNumberExposure);
exports.default = router;
