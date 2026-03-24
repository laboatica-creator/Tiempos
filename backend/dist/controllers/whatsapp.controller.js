"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWhatsAppWebhook = void 0;
const index_1 = require("../index");
const ocr_service_1 = require("../services/ocr.service");
const handleWhatsAppWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // In a real implementation, this would receive data from Twilio or Meta API.
    // Body would contain: { Body: text, From: 'whatsapp:+506...', NumMedia: '1', MediaUrl0: '...' }
    const { From, Body, MediaUrl0 } = req.body;
    if (!MediaUrl0) {
        // Fallback or just text message
        return res.json({ message: 'Received text message, but expected image for SINPE receipt.' });
    }
    // Clean Phone Number
    const phoneNumber = From.replace('whatsapp:', '').trim();
    try {
        // 1. Identify User
        const userRes = yield index_1.pool.query(`SELECT id, full_name FROM users WHERE phone_number = $1`, [phoneNumber]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'Phone number not registered in the platform.' });
        }
        const user = userRes.rows[0];
        // 2. Process Image with OCR
        const ocrData = yield ocr_service_1.OCRService.processReceipt(MediaUrl0);
        if (!ocrData.referenceNumber || !ocrData.amount) {
            return res.json({ message: 'OCR failed to extract essential SINPE data. Manual review required.' });
        }
        const client = yield index_1.pool.connect();
        try {
            yield client.query('BEGIN');
            // 3. Fraud Detection
            const duplicateCheck = yield client.query(`SELECT id FROM sinpe_deposits WHERE reference_number = $1 OR receipt_hash = $2`, [ocrData.referenceNumber, ocrData.hash]);
            if (duplicateCheck.rows.length > 0) {
                yield client.query('ROLLBACK');
                return res.json({ message: 'This receipt has already been registered or is a duplicate.' });
            }
            // 4. Create Deposit Record (Auto-approve if exact and clear?)
            // For now, let's create it as PENDING and let an automated rule approve it if certain criteria met.
            // Or just Auto-approve if everything extracted correctly.
            const depositRes = yield client.query(`INSERT INTO sinpe_deposits (user_id, amount, reference_number, receipt_hash, sender_name, status) 
                 VALUES ($1, $2, $3, $4, $5, 'APPROVED') 
                 RETURNING id, amount`, [user.id, ocrData.amount, ocrData.referenceNumber, ocrData.hash, ocrData.senderName]);
            const depositId = depositRes.rows[0].id;
            // 5. Credit Wallet
            const walletRes = yield client.query(`UPDATE wallets SET balance = balance + $1, total_deposits = total_deposits + $1, updated_at = NOW() 
                 WHERE user_id = $2 RETURNING id`, [ocrData.amount, user.id]);
            yield client.query(`INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id) 
                 VALUES ($1, 'DEPOSIT', $2, 'Automated WhatsApp SINPE Approval', $3)`, [walletRes.rows[0].id, ocrData.amount, depositId]);
            yield client.query('COMMIT');
            res.json({
                message: `SINPE Recharge of ${ocrData.amount} CRC applied successfully!`,
                user: user.full_name,
                ref: ocrData.referenceNumber
            });
        }
        catch (error) {
            yield client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('WhatsApp Processing error:', error);
        res.status(500).json({ error: 'Internal failure processing receipt.' });
    }
});
exports.handleWhatsAppWebhook = handleWhatsAppWebhook;
