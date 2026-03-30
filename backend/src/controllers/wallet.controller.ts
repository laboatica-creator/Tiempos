import { Request, Response } from 'express';
import { pool } from '../index';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getWalletBalance = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const result = await pool.query(
            `SELECT balance, total_deposits, total_bets, total_winnings FROM wallets WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching wallet balance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

import { OCRService } from '../services/ocr.service';

export const createSinpeRecharge = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { amount, reference_number, receipt_image_url, method_type, bank_name } = req.body;

        if (!reference_number) {
            return res.status(400).json({ error: 'Referencia requerida.' });
        }

        // Fraud detection: check if reference already exists
        const duplicateCheck = await pool.query(`SELECT id FROM sinpe_deposits WHERE reference_number = $1`, [reference_number]);
        if (duplicateCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Esta referencia ya ha sido registrada.' });
        }

        // Optional OCR Processing if image is provided
        let ocrResult = null;
        if (receipt_image_url) {
            ocrResult = await OCRService.processReceipt(receipt_image_url);
            
            // Basic fraud detection: compare hash
            const hashCheck = await pool.query(`SELECT id FROM sinpe_deposits WHERE receipt_hash = $1`, [ocrResult.hash]);
            if (hashCheck.rows.length > 0) {
                return res.status(400).json({ error: 'Este comprobante ya ha sido utilizado.' });
            }
        }

        const result = await pool.query(
            `INSERT INTO sinpe_deposits (user_id, amount, reference_number, receipt_hash, sender_name, method_type, bank_name) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING id, amount, status, created_at`,
            [userId, amount, reference_number, ocrResult?.hash || null, ocrResult?.senderName || null, method_type || 'SINPE', bank_name || 'SINPE MOVIL']
        );

        res.status(201).json({ message: 'Recarga enviada y pendiente de aprobación.' });
    } catch (error) {
        console.error('Error creating recharge:', error);
        res.status(500).json({ error: 'Error interno de servidor' });
    }
};

export const requestWithdrawal = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { amount, method, details } = req.body;

        if (!amount || amount <= 0) return res.status(400).json({ error: 'Monto inválido.' });
        if (!method || !['SINPE', 'IBAN'].includes(method)) return res.status(400).json({ error: 'Método no válido.' });
        if (method === 'IBAN' && !details) return res.status(400).json({ error: 'Se requiere el número de cuenta IBAN.' });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const walletRes = await client.query('SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
            if (walletRes.rows.length === 0) throw new Error('Billetera no encontrada');
            const wallet = walletRes.rows[0];

            if (Number(wallet.balance) < Number(amount)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Fondos insuficientes para solicitar este retiro.' });
            }

            // Deduct immediately locally to lock funds (or leave as pending logic, here we deduct to lock)
            await client.query(
                `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2`,
                [amount, wallet.id]
            );

            await client.query(
                `INSERT INTO withdrawal_requests (user_id, amount, method, details, status) VALUES ($1, $2, $3, $4, 'PENDING')`,
                [userId, amount, method, details || 'SINPE REGISTRADO']
            );

            await client.query('COMMIT');
            res.status(201).json({ message: 'Solicitud de retiro enviada correctamente. Fondos bloqueados temporalmente.' });
        } catch (e: any) {
            await client.query('ROLLBACK');
            res.status(500).json({ error: e.message });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error requesting withdrawal:', error);
        res.status(500).json({ error: 'Error interno de servidor' });
    }
};

export const approveRecharge = async (req: AuthRequest, res: Response) => {
    const adminId = req.user?.id;
    const { rechargeId } = req.params;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check recharge status
        const rechargeRes = await client.query(
            `SELECT * FROM sinpe_deposits WHERE id = $1 FOR UPDATE`,
            [rechargeId]
        );

        if (rechargeRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Recharge not found.' });
        }

        const recharge = rechargeRes.rows[0];

        if (recharge.status !== 'PENDING') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Recharge is already ${recharge.status}.` });
        }

        // Update recharge status
        await client.query(
            `UPDATE sinpe_deposits SET status = 'APPROVED', approved_by = $1, updated_at = NOW() WHERE id = $2`,
            [adminId, rechargeId]
        );

        // Credit Wallet
        const walletRes = await client.query(
            `UPDATE wallets SET balance = balance + $1, total_deposits = total_deposits + $1, updated_at = NOW() WHERE user_id = $2 RETURNING id, balance`,
            [recharge.amount, recharge.user_id]
        );

        const walletId = walletRes.rows[0].id;

        // Create Wallet Transaction
        await client.query(
            `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id) VALUES ($1, 'DEPOSIT', $2, 'SINPE Recharge Approved', $3)`,
            [walletId, recharge.amount, rechargeId]
        );

        await client.query('COMMIT');

        res.json({ message: 'Recharge approved and wallet credited successfully.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error approving recharge:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
};

export const rejectRecharge = async (req: AuthRequest, res: Response) => {
    const { rechargeId } = req.params;
    const { note } = req.body;
    try {
        const result = await pool.query(
            `UPDATE sinpe_deposits SET status = 'REJECTED', processed_at = NOW() WHERE id = $1 AND status = 'PENDING' RETURNING *`,
            [rechargeId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Recharge not found or already processed' });
        res.json({ message: 'Recharge rejected successfully.' });
    } catch (error: any) {
        console.error('❌ [WALLET_REJECT_ERROR]:', error.message, error.stack);
        res.status(500).json({ error: 'Error del servidor al rechazar la recarga: ' + error.message });
    }
};

export const getPendingRecharges = async (req: AuthRequest, res: Response) => {
    try {
        const role = req.user?.role;
        const userId = req.user?.id;

        // FRANCHISE sees only their players' deposits
        // ADMIN sees only non-franchise players (franchise_id IS NULL)
        let query: string;
        let params: any[];

        if (role === 'FRANCHISE') {
            query = `
                SELECT sd.*, u.full_name as user_name, u.phone_number, u.email 
                FROM sinpe_deposits sd 
                JOIN users u ON sd.user_id = u.id 
                WHERE sd.status = 'PENDING' AND u.franchise_id = $1
                ORDER BY sd.created_at DESC`;
            params = [userId];
        } else {
            // ADMIN: only players NOT assigned to any franchise
            query = `
                SELECT sd.*, u.full_name as user_name, u.phone_number, u.email 
                FROM sinpe_deposits sd 
                JOIN users u ON sd.user_id = u.id 
                WHERE sd.status = 'PENDING' AND u.franchise_id IS NULL
                ORDER BY sd.created_at DESC`;
            params = [];
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching pending recharges:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getPaymentMethods = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const result = await pool.query(
            `SELECT id, type, provider, last4, is_default FROM payment_methods WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const addPaymentMethod = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { type, provider, card_number, expiry_date } = req.body;

        if (!card_number || card_number.length < 13) {
            return res.status(400).json({ error: 'Invalid card number' });
        }

        const last4 = card_number.slice(-4);
        
        // Basic check for existing card
        const check = await pool.query(
            `SELECT id FROM payment_methods WHERE user_id = $1 AND last4 = $2 AND provider = $3`,
            [userId, last4, provider]
        );

        if (check.rows.length > 0) {
            return res.status(400).json({ error: 'This card is already registered.' });
        }

        const result = await pool.query(
            `INSERT INTO payment_methods (user_id, type, provider, last4, expiry_date) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id, type, provider, last4`,
            [userId, type, provider, last4, expiry_date]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding payment method:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deletePaymentMethod = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { methodId } = req.params;
        await pool.query(`DELETE FROM payment_methods WHERE id = $1 AND user_id = $2`, [methodId, userId]);
        res.json({ message: 'Payment method deleted' });
    } catch (error) {
        console.error('Error deleting payment method:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const adjustWalletBalance = async (req: AuthRequest, res: Response) => {
    const { userId, amount, type, description } = req.body; // type: 'CREDIT' or 'DEBIT'
    const adminId = req.user?.id;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if wallet exists
        const walletRes = await client.query(`SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE`, [userId]);
        if (walletRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Wallet not found' });
        }

        const walletId = walletRes.rows[0].id;
        const currentBalance = parseFloat(walletRes.rows[0].balance);
        const adjustmentAmount = parseFloat(amount);

        let newBalance = currentBalance;
        if (type === 'CREDIT') {
            newBalance += adjustmentAmount;
        } else {
            newBalance -= adjustmentAmount;
        }

        if (newBalance < 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Insufficient funds for debit' });
        }

        // Update Wallet
        await client.query(
            `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`,
            [newBalance, walletId]
        );

        // Record Transaction
        await client.query(
            `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id) 
             VALUES ($1, $2, $3, $4, $5)`,
            [walletId, type === 'CREDIT' ? 'DEPOSIT' : 'WITHDRAW', adjustmentAmount, description || `Manual Adjustment by Admin ${adminId}`, adminId]
        );

        await client.query('COMMIT');
        res.json({ message: 'Balance adjusted successfully', newBalance });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adjusting balance:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
};

export const getPendingWithdrawals = async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT wr.*, u.full_name, u.phone_number, u.email 
             FROM withdrawal_requests wr 
             JOIN users u ON wr.user_id = u.id 
             WHERE wr.status = 'PENDING' ORDER BY wr.created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching withdrawals' });
    }
};

export const approveWithdrawal = async (req: AuthRequest, res: Response) => {
    const { withdrawalId } = req.params;
    const { status, admin_notes } = req.body; // APPROVED or REJECTED
    const adminId = req.user?.id;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const withdrawalRes = await client.query(`SELECT * FROM withdrawal_requests WHERE id = $1 FOR UPDATE`, [withdrawalId]);
        if (withdrawalRes.rows.length === 0) throw new Error('Retiro no encontrado.');
        const withdrawal = withdrawalRes.rows[0];

        if (withdrawal.status !== 'PENDING') throw new Error('Este retiro ya fue procesado.');

        if (status === 'REJECTED') {
            // Refund the wallet since we locked funds on request (see requestWithdrawal)
            await client.query(`UPDATE wallets SET balance = balance + $1 WHERE user_id = $2`, [withdrawal.amount, withdrawal.user_id]);
        }

        await client.query(
            `UPDATE withdrawal_requests SET status = $1, processed_by = $2, admin_notes = $3, updated_at = NOW() WHERE id = $4`,
            [status, adminId, admin_notes, withdrawalId]
        );

        await client.query('COMMIT');
        res.json({ message: `Retiro ${status.toLowerCase()} correctamente.` });
    } catch (e: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
};

export const getWalletHistory = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        
        // Combine pending SINPE deposits and actual wallet transactions
        const result = await pool.query(
            `
            (SELECT 
                amount, 
                'SINPE_DEPOSIT' as type, 
                status, 
                created_at, 
                method_type,
                reference_number as details
             FROM sinpe_deposits 
             WHERE user_id = $1)
            UNION ALL
            (SELECT 
                amount, 
                type::text, 
                'COMPLETED' as status, 
                created_at, 
                'WALLET' as method_type,
                description as details
             FROM wallet_transactions wt
             JOIN wallets w ON wt.wallet_id = w.id
             WHERE w.user_id = $1)
            ORDER BY created_at DESC LIMIT 50
            `,
            [userId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching wallet history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getDepositHistory = async (req: AuthRequest, res: Response) => {
    // Legacy support or specific use
    getWalletHistory(req, res);
};

export const getWinningsHistory = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const result = await pool.query(
            `SELECT w.*, d.lottery_type, d.draw_date, d.draw_time 
             FROM winnings w 
             JOIN draws d ON w.draw_id = d.id 
             WHERE w.user_id = $1 ORDER BY w.created_at DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching winnings' });
    }
};

