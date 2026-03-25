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
exports.cancelBet = exports.getUserBets = exports.getNumberExposure = exports.placeBet = void 0;
const index_1 = require("../index");
const email_service_1 = require("../services/email.service");
const MAX_BET_PER_NUMBER_PER_USER = 20000;
const MAX_TOTAL_BET_PER_NUMBER_PER_DRAW = 50000;
const PAYOUT_MULTIPLIER = 90;
const placeBet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { draw_id, bets } = req.body; // bets: Array of { number: string, amount: number }
    if (!draw_id || !bets || !Array.isArray(bets) || bets.length === 0) {
        return res.status(400).json({ error: 'Invalid bet request format.' });
    }
    const client = yield index_1.pool.connect();
    try {
        yield client.query('BEGIN');
        // Verify Draw is OPEN
        const drawRes = yield client.query(`SELECT lottery_type, draw_date, draw_time, status FROM draws WHERE id = $1`, [draw_id]);
        if (drawRes.rows.length === 0 || drawRes.rows[0].status !== 'OPEN') {
            yield client.query('ROLLBACK');
            return res.status(400).json({ error: 'Draw is not open for betting.' });
        }
        let totalBetAmount = 0;
        // Process each bet item
        for (const bet of bets) {
            const { number, amount } = bet;
            if (amount < 200) {
                yield client.query('ROLLBACK');
                return res.status(400).json({ error: `Minimum bet is 200 CRC per number. (Number ${number})` });
            }
            if (amount > MAX_BET_PER_NUMBER_PER_USER) {
                yield client.query('ROLLBACK');
                return res.status(400).json({ error: `Maximum bet per number per user is 20000 CRC. (Number ${number})` });
            }
            // DB Risk Management check (Scalable & Consistent)
            // Upsert with Row Lock
            const exposureRes = yield client.query(`INSERT INTO draw_exposure (draw_id, number, current_exposure) 
                 VALUES ($1, $2, $3)
                 ON CONFLICT (draw_id, number) 
                 DO UPDATE SET current_exposure = draw_exposure.current_exposure 
                 RETURNING current_exposure, max_exposure, is_closed`, [draw_id, number, 0] // Start with 0 if new
            );
            // Now lock it specifically
            const lockRes = yield client.query(`SELECT current_exposure, max_exposure, is_closed FROM draw_exposure 
                 WHERE draw_id = $1 AND number = $2 FOR UPDATE`, [draw_id, number]);
            const { current_exposure, max_exposure, is_closed } = lockRes.rows[0];
            if (is_closed || (Number(current_exposure) + amount) > Number(max_exposure)) {
                yield client.query('ROLLBACK');
                return res.status(400).json({
                    error: `Number ${number} has reached its limit or is closed.`,
                    available: Number(max_exposure) - Number(current_exposure)
                });
            }
            // Update Exposure
            yield client.query(`UPDATE draw_exposure SET current_exposure = current_exposure + $1 WHERE draw_id = $2 AND number = $3`, [amount, draw_id, number]);
            totalBetAmount += amount;
        }
        // Deduct from Wallet
        const walletRes = yield client.query(`UPDATE wallets SET balance = balance - $1, total_bets = total_bets + $1, updated_at = NOW() WHERE user_id = $2 AND balance >= $1 RETURNING id`, [totalBetAmount, userId]);
        if (walletRes.rows.length === 0) {
            yield client.query('ROLLBACK');
            return res.status(400).json({ error: 'Insufficient wallet balance.' });
        }
        const walletId = walletRes.rows[0].id;
        // Insert Bet Ticket
        const betTicketRes = yield client.query(`INSERT INTO bets (user_id, draw_id, total_amount) VALUES ($1, $2, $3) RETURNING id`, [userId, draw_id, totalBetAmount]);
        const betTicketId = betTicketRes.rows[0].id;
        // Insert Bet Items
        for (const bet of bets) {
            yield client.query(`INSERT INTO bet_items (bet_id, number, amount) VALUES ($1, $2, $3)`, [betTicketId, bet.number, bet.amount]);
        }
        // Log Transaction
        yield client.query(`INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id) VALUES ($1, 'BET', $2, 'Bet Placed', $3)`, [walletId, totalBetAmount, betTicketId]);
        yield client.query('COMMIT');
        // Fetch User Email for Notification
        const userRes = yield client.query(`SELECT email FROM users WHERE id = $1`, [userId]);
        if (userRes.rows.length > 0) {
            const userEmail = userRes.rows[0].email;
            const drawInfo = `${drawRes.rows[0].lottery_type} - ${drawRes.rows[0].draw_date} ${drawRes.rows[0].draw_time}`;
            try {
                yield (0, email_service_1.sendTicketPurchaseEmail)(userEmail, drawInfo, bets, totalBetAmount);
            }
            catch (err) {
                console.warn('Error sending purchase email:', err);
            }
        }
        // WebSocket Notify (To be implemented)
        // req.app.get('io').emit('bet_placed', { user: userId, draw_id });
        res.status(201).json({ message: 'Bet placed successfully!', bet_id: betTicketId, totalAmount: totalBetAmount });
    }
    catch (error) {
        yield client.query('ROLLBACK');
        console.error('Bet placement error:', error);
        res.status(500).json({ error: 'Internal server error while placing bet.' });
    }
    finally {
        client.release();
    }
});
exports.placeBet = placeBet;
// Returns heat-map data for UI
const getNumberExposure = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { draw_id } = req.params;
    try {
        const result = yield index_1.pool.query(`SELECT number, current_exposure FROM draw_exposure WHERE draw_id = $1`, [draw_id]);
        const exposure = {};
        for (let i = 0; i <= 99; i++) {
            const numStr = i.toString().padStart(2, '0');
            exposure[numStr] = 0;
        }
        for (const row of result.rows) {
            exposure[row.number] = Number(row.current_exposure);
        }
        res.json({ draw_id, max_limit: MAX_TOTAL_BET_PER_NUMBER_PER_DRAW, exposure });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch exposure' });
    }
});
exports.getNumberExposure = getNumberExposure;
const getUserBets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    try {
        const result = yield index_1.pool.query(`SELECT b.id as bet_id, b.total_amount, b.status as bet_status, b.created_at,
                    b.draw_id, d.lottery_type, d.draw_date, d.draw_time, d.status as draw_status,
                    bi.number, bi.amount, bi.status as item_status
             FROM bets b
             JOIN draws d ON b.draw_id = d.id
             JOIN bet_items bi ON bi.bet_id = b.id
             WHERE b.user_id = $1
             ORDER BY d.draw_date ASC, d.draw_time ASC`, [userId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching user bets:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getUserBets = getUserBets;
const cancelBet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { betId } = req.params;
    const client = yield index_1.pool.connect();
    try {
        yield client.query('BEGIN');
        // 1. Fetch bet and verify ownership + draw status
        const betRes = yield client.query(`SELECT b.*, d.status as draw_status, d.draw_date, d.draw_time 
             FROM bets b 
             JOIN draws d ON b.draw_id = d.id 
             WHERE b.id = $1 AND b.user_id = $2`, [betId, userId]);
        if (betRes.rows.length === 0) {
            yield client.query('ROLLBACK');
            return res.status(404).json({ error: 'Bet not found or access denied.' });
        }
        const bet = betRes.rows[0];
        if (bet.status !== 'ACTIVE') {
            yield client.query('ROLLBACK');
            return res.status(400).json({ error: `Cannot cancel a bet with status ${bet.status}` });
        }
        if (bet.draw_status !== 'OPEN') {
            yield client.query('ROLLBACK');
            return res.status(400).json({ error: 'Cannot cancel a bet for a closed or finished draw.' });
        }
        // 20 minute check
        const now = new Date();
        const [h, m] = bet.draw_time.split(':').map(Number);
        const drawDate = new Date(bet.draw_date);
        drawDate.setHours(h, m, 0, 0);
        const diff = (drawDate.getTime() - now.getTime()) / (1000 * 60);
        if (diff < 20) {
            yield client.query('ROLLBACK');
            return res.status(400).json({ error: 'No se puede anular o modificar una jugada a menos de 20 minutos del sorteo.' });
        }
        // 2. Refund wallet
        const walletRes = yield client.query(`UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2 RETURNING id`, [bet.total_amount, userId]);
        // Record transaction
        yield client.query(`INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id) 
             VALUES ($1, 'REFUND', $2, 'Bet Cancelled', $3)`, [walletRes.rows[0].id, bet.total_amount, betId]);
        // 3. Update Draw Exposure
        const itemsRes = yield client.query(`SELECT number, amount FROM bet_items WHERE bet_id = $1`, [betId]);
        for (const item of itemsRes.rows) {
            yield client.query(`UPDATE draw_exposure SET current_exposure = current_exposure - $1 WHERE draw_id = $2 AND number = $3`, [item.amount, bet.draw_id, item.number]);
        }
        // 4. Update status
        yield client.query(`UPDATE bets SET status = 'CANCELLED' WHERE id = $1`, [betId]);
        yield client.query(`UPDATE bet_items SET status = 'CANCELLED' WHERE bet_id = $1`, [betId]);
        yield client.query('COMMIT');
        res.json({ message: 'Bet cancelled and refunded successfully.' });
    }
    catch (error) {
        yield client.query('ROLLBACK');
        console.error('Error cancelling bet:', error);
        res.status(500).json({ error: 'Internal server error while cancelling bet.' });
    }
    finally {
        client.release();
    }
});
exports.cancelBet = cancelBet;
