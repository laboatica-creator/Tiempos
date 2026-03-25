"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const whatsapp_controller_1 = require("../controllers/whatsapp.controller");
const router = (0, express_1.Router)();
router.post('/webhook', whatsapp_controller_1.handleWhatsAppWebhook);
exports.default = router;
