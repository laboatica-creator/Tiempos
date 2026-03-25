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
exports.adjustWalletBalance = exports.deletePaymentMethod = exports.addPaymentMethod = exports.getPaymentMethods = exports.getPendingRecharges = exports.approveRecharge = exports.requestWithdrawal = exports.createSinpeRecharge = exports.getWalletBalance = void 0;
const index_1 = require("../index");
const getWalletBalance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const result = yield index_1.pool.query(`SELECT balance, total_deposits, total_bets, total_winnings FROM wallets WHERE user_id = $1`, [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Wallet not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error fetching wallet balance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getWalletBalance = getWalletBalance;
const ocr_service_1 = require("../services/ocr.service");
const createSinpeRecharge = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { amount, reference_number, receipt_image_url, method_type } = req.body;
        if (!reference_number) {
            return res.status(400).json({ error: 'Referencia requerida.' });
        }
        // Fraud detection: check if reference already exists
        const duplicateCheck = yield index_1.pool.query(`SELECT id FROM sinpe_deposits WHERE reference_number = $1`, [reference_number]);
        if (duplicateCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Esta referencia ya ha sido registrada.' });
        }
        // Optional OCR Processing if image is provided
        let ocrResult = null;
        if (receipt_image_url) {
            ocrResult = yield ocr_service_1.OCRService.processReceipt(receipt_image_url);
            // Basic fraud detection: compare hash
            const hashCheck = yield index_1.pool.query(`SELECT id FROM sinpe_deposits WHERE receipt_hash = $1`, [ocrResult.hash]);
            if (hashCheck.rows.length > 0) {
                return res.status(400).json({ error: 'Este comprobante ya ha sido utilizado.' });
            }
        }
        const result = yield index_1.pool.query(`INSERT INTO sinpe_deposits (user_id, amount, reference_number, receipt_hash, sender_name, method_type) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, amount, status, created_at`, [userId, amount, reference_number, (ocrResult === null || ocrResult === void 0 ? void 0 : ocrResult.hash) || null, (ocrResult === null || ocrResult === void 0 ? void 0 : ocrResult.senderName) || null, method_type || 'SINPE']);
        res.status(201).json({ message: 'Recarga enviada y pendiente de aprobación.' });
    }
    catch (error) {
        console.error('Error creating recharge:', error);
        res.status(500).json({ error: 'Error interno de servidor' });
    }
});
exports.createSinpeRecharge = createSinpeRecharge;
const requestWithdrawal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { amount, method, details } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ error: 'Monto inválido.' });
        if (!method || !['SINPE', 'IBAN'].includes(method))
            return res.status(400).json({ error: 'Método no válido.' });
        if (method === 'IBAN' && !details)
            return res.status(400).json({ error: 'Se requiere el número de cuenta IBAN.' });
        const client = yield index_1.pool.connect();
        try {
            yield client.query('BEGIN');
            const walletRes = yield client.query('SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
            if (walletRes.rows.length === 0)
                throw new Error('Billetera no encontrada');
            const wallet = walletRes.rows[0];
            if (Number(wallet.balance) < Number(amount)) {
                yield client.query('ROLLBACK');
                return res.status(400).json({ error: 'Fondos insuficientes para solicitar este retiro.' });
            }
            // Deduct immediately locally to lock funds (or leave as pending logic, here we deduct to lock)
            yield client.query(`UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2`, [amount, wallet.id]);
            yield client.query(`INSERT INTO withdrawal_requests (user_id, amount, method, details, status) VALUES ($1, $2, $3, $4, 'PENDING')`, [userId, amount, method, details || 'SINPE REGISTRADO']);
            yield client.query('COMMIT');
            res.status(201).json({ message: 'Solicitud de retiro enviada correctamente. Fondos bloqueados temporalmente.' });
        }
        catch (e) {
            yield client.query('ROLLBACK');
            res.status(500).json({ error: e.message });
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Error requesting withdrawal:', error);
        res.status(500).json({ error: 'Error interno de servidor' });
    }
});
exports.requestWithdrawal = requestWithdrawal;
const approveRecharge = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { rechargeId } = req.params;
    const client = yield index_1.pool.connect();
    try {
        yield client.query('BEGIN');
        // Check recharge status
        const rechargeRes = yield client.query(`SELECT * FROM sinpe_deposits WHERE id = $1 FOR UPDATE`, [rechargeId]);
        if (rechargeRes.rows.length === 0) {
            yield client.query('ROLLBACK');
            return res.status(404).json({ error: 'Recharge not found.' });
        }
        const recharge = rechargeRes.rows[0];
        if (recharge.status !== 'PENDING') {
            yield client.query('ROLLBACK');
            return res.status(400).json({ error: `Recharge is already ${recharge.status}.` });
        }
        // Update recharge status
        yield client.query(`UPDATE sinpe_deposits SET status = 'APPROVED', approved_by = $1, updated_at = NOW() WHERE id = $2`, [adminId, rechargeId]);
        // Credit Wallet
        const walletRes = yield client.query(`UPDATE wallets SET balance = balance + $1, total_deposits = total_deposits + $1, updated_at = NOW() WHERE user_id = $2 RETURNING id, balance`, [recharge.amount, recharge.user_id]);
        const walletId = walletRes.rows[0].id;
        // Create Wallet Transaction
        yield client.query(`INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id) VALUES ($1, 'DEPOSIT', $2, 'SINPE Recharge Approved', $3)`, [walletId, recharge.amount, rechargeId]);
        yield client.query('COMMIT');
        res.json({ message: 'Recharge approved and wallet credited successfully.' });
    }
    catch (error) {
        yield client.query('ROLLBACK');
        console.error('Error approving recharge:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
    finally {
        client.release();
    }
});
exports.approveRecharge = approveRecharge;
const getPendingRecharges = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const role = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
        // FRANCHISE sees only their players' deposits
        // ADMIN sees only non-franchise players (franchise_id IS NULL)
        let query;
        let params;
        if (role === 'FRANCHISE') {
            query = `
                SELECT sd.*, u.full_name as user_name, u.phone_number, u.email 
                FROM sinpe_deposits sd 
                JOIN users u ON sd.user_id = u.id 
                WHERE sd.status = 'PENDING' AND u.franchise_id = $1
                ORDER BY sd.created_at DESC`;
            params = [userId];
        }
        else {
            // ADMIN: only players NOT assigned to any franchise
            query = `
                SELECT sd.*, u.full_name as user_name, u.phone_number, u.email 
                FROM sinpe_deposits sd 
                JOIN users u ON sd.user_id = u.id 
                WHERE sd.status = 'PENDING' AND u.franchise_id IS NULL
                ORDER BY sd.created_at DESC`;
            params = [];
        }
        const result = yield index_1.pool.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching pending recharges:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getPendingRecharges = getPendingRecharges;
const getPaymentMethods = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const result = yield index_1.pool.query(`SELECT id, type, provider, last4, is_default FROM payment_methods WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching payment methods:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getPaymentMethods = getPaymentMethods;
const addPaymentMethod = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { type, provider, card_number, expiry_date } = req.body;
        if (!card_number || card_number.length < 13) {
            return res.status(400).json({ error: 'Invalid card number' });
        }
        const last4 = card_number.slice(-4);
        // Basic check for existing card
        const check = yield index_1.pool.query(`SELECT id FROM payment_methods WHERE user_id = $1 AND last4 = $2 AND provider = $3`, [userId, last4, provider]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: 'This card is already registered.' });
        }
        const result = yield index_1.pool.query(`INSERT INTO payment_methods (user_id, type, provider, last4, expiry_date) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id, type, provider, last4`, [userId, type, provider, last4, expiry_date]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error adding payment method:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.addPaymentMethod = addPaymentMethod;
const deletePaymentMethod = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { methodId } = req.params;
        yield index_1.pool.query(`DELETE FROM payment_methods WHERE id = $1 AND user_id = $2`, [methodId, userId]);
        res.json({ message: 'Payment method deleted' });
    }
    catch (error) {
        console.error('Error deleting payment method:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.deletePaymentMethod = deletePaymentMethod;
const adjustWalletBalance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { userId, amount, type, description } = req.body; // type: 'CREDIT' or 'DEBIT'
    const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const client = yield index_1.pool.connect();
    try {
        yield client.query('BEGIN');
        // Check if wallet exists
        const walletRes = yield client.query(`SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE`, [userId]);
        if (walletRes.rows.length === 0) {
            yield client.query('ROLLBACK');
            return res.status(404).json({ error: 'Wallet not found' });
        }
        const walletId = walletRes.rows[0].id;
        const currentBalance = parseFloat(walletRes.rows[0].balance);
        const adjustmentAmount = parseFloat(amount);
        let newBalance = currentBalance;
        if (type === 'CREDIT') {
            newBalance += adjustmentAmount;
        }
        else {
            newBalance -= adjustmentAmount;
        }
        if (newBalance < 0) {
            yield client.query('ROLLBACK');
            return res.status(400).json({ error: 'Insufficient funds for debit' });
        }
        // Update Wallet
        yield client.query(`UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`, [newBalance, walletId]);
        // Record Transaction
        yield client.query(`INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id) 
             VALUES ($1, $2, $3, $4, $5)`, [walletId, type === 'CREDIT' ? 'DEPOSIT' : 'WITHDRAW', adjustmentAmount, description || `Manual Adjustment by Admin ${adminId}`, adminId]);
        yield client.query('COMMIT');
        res.json({ message: 'Balance adjusted successfully', newBalance });
    }
    catch (error) {
        yield client.query('ROLLBACK');
        console.error('Error adjusting balance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
    finally {
        client.release();
    }
});
exports.adjustWalletBalance = adjustWalletBalance;
