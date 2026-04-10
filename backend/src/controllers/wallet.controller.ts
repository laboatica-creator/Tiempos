import { Response } from 'express';
import { pool } from '../database/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { OCRService } from '../services/ocr.service';

export const getWalletBalance = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const result = await pool.query(
            `SELECT balance, bonus_balance, total_deposits, total_bets, total_winnings FROM wallets WHERE user_id = $1`,
            [userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Billetera no encontrada' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching wallet balance:', error);
        res.status(500).json({ error: 'Error interno' });
    }
};

export const createSinpeRecharge = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { amount, reference_number, receipt_image_url, bank_name } = req.body;

        if (!reference_number) return res.status(400).json({ error: 'Referencia requerida.' });

        const duplicateCheck = await pool.query(`SELECT id FROM sinpe_deposits WHERE reference_number = $1`, [reference_number]);
        if (duplicateCheck.rows.length > 0) return res.status(400).json({ error: 'Esta referencia ya ha sido registrada.' });

        let ocrData = null;
        if (receipt_image_url) {
            try {
                ocrData = await OCRService.processReceipt(receipt_image_url);
            } catch (e) {
                console.warn('OCR Failed, continuing manually');
            }
        }

        await pool.query(
            `INSERT INTO sinpe_deposits (user_id, amount, reference_number, receipt_hash, sender_name, bank_name, status) 
             VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')`,
            [userId, amount, reference_number, ocrData?.hash || null, ocrData?.senderName || null, bank_name || 'SINPE MOVIL']
        );

        res.status(201).json({ message: 'Recarga enviada y pendiente de aprobación.' });
    } catch (error) {
        console.error('Error creating recharge:', error);
        res.status(500).json({ error: 'Error al registrar recarga' });
    }
};

export const requestWithdrawal = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { amount, method, details } = req.body;
    
    if (!amount || amount < 1000) return res.status(400).json({ error: 'Monto mínimo de retiro ₡1,000.' });
    if (!method || !['SINPE', 'IBAN'].includes(method)) return res.status(400).json({ error: 'Método no válido.' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const walletRes = await client.query('SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
        const wallet = walletRes.rows[0];

        if (Number(wallet.balance) < Number(amount)) {
            throw new Error('Saldo insuficiente. El bono promocional no es retirable.');
        }

        await client.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [amount, wallet.id]);
        
        await client.query(
            `INSERT INTO wallet_transactions (wallet_id, type, amount, description) VALUES ($1, 'WITHDRAW', $2, $3)`,
            [wallet.id, amount, `Retiro solicitado vía ${method}`]
        );

        await client.query(
            `INSERT INTO withdrawal_requests (user_id, amount, method, details, status) VALUES ($1, $2, $3, $4, 'PENDING')`,
            [userId, amount, method, details]
        );

        await client.query('COMMIT');
        res.json({ message: 'Solicitud enviada correctamente.' });
    } catch (e: any) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
};

export const getPaymentMethods = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const result = await pool.query(
            `SELECT DISTINCT ON (bank_name, phone_number) 
                    id, bank_name as name, phone_number as "sinpePhone", account_number as account 
             FROM payment_methods 
             WHERE user_id = $1 OR user_id IS NULL AND is_active = true
             ORDER BY bank_name, phone_number, user_id NULLS FIRST`,
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        res.status(500).json({ error: 'Error obteniendo métodos de pago' });
    }
};

export const addPaymentMethod = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { type, bank_name, phone_number, account_number } = req.body;
        await pool.query(
            `INSERT INTO payment_methods (user_id, type, bank_name, phone_number, account_number) 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, type, bank_name, phone_number, account_number]
        );
        res.status(201).json({ message: 'Método de pago agregado correctamente.' });
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

export const getWalletTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { limit = 50, page = 1 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const query = `
            SELECT 
                tx_id as id,
                amount,
                type,
                status,
                created_at,
                method,
                details
            FROM (
                (SELECT 
                    sd.id as tx_id, 
                    sd.amount, 
                    'DEPÓSITO SINPE' as type, 
                    sd.status, 
                    sd.created_at, 
                    'SINPE' as method, 
                    sd.reference_number as details 
                FROM sinpe_deposits sd 
                WHERE sd.user_id = $1)
                UNION ALL
                (SELECT 
                    wr.id as tx_id, 
                    wr.amount, 
                    'RETIRO' as type, 
                    wr.status, 
                    wr.created_at, 
                    wr.method, 
                    wr.details 
                FROM withdrawal_requests wr 
                WHERE wr.user_id = $1)
                UNION ALL
                (SELECT 
                    wt.id as tx_id, 
                    wt.amount, 
                    wt.type::text, 
                    'COMPLETED' as status, 
                    wt.created_at, 
                    'SISTEMA' as method, 
                    wt.description as details 
                FROM wallet_transactions wt 
                JOIN wallets w ON wt.wallet_id = w.id 
                WHERE w.user_id = $1)
            ) as all_txs
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await pool.query(query, [userId, limit, offset]);
        res.json({ data: result.rows });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Error al obtener transacciones' });
    }
};

export const getWalletHistory = async (req: AuthRequest, res: Response) => {
    getWalletTransactions(req, res);
};

export const approveRecharge = async (req: AuthRequest, res: Response) => {
    const adminId = req.user?.id;
    const { rechargeId } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const rechargeRes = await client.query(`SELECT * FROM sinpe_deposits WHERE id = $1 FOR UPDATE`, [rechargeId]);
        if (rechargeRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Deposit not found.' });
        }
        const recharge = rechargeRes.rows[0];
        if (recharge.status !== 'PENDING') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Deposit is already ${recharge.status}.` });
        }

        await client.query(
            `UPDATE sinpe_deposits SET status = 'APPROVED', approved_by = $1, updated_at = NOW() WHERE id = $2`,
            [adminId, rechargeId]
        );

        const walletRes = await client.query(
            `UPDATE wallets SET balance = balance + $1, total_deposits = total_deposits + $1, updated_at = NOW() WHERE user_id = $2 RETURNING id`,
            [recharge.amount, recharge.user_id]
        );

        await client.query(
            `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id) 
             VALUES ($1, 'DEPOSIT', $2, 'SINPE Recharge Approved', $3)`,
            [walletRes.rows[0].id, recharge.amount, rechargeId]
        );

        await client.query('COMMIT');
        res.json({ message: 'Recharge approved successfully.' });
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
    try {
        await pool.query(
            `UPDATE sinpe_deposits SET status = 'REJECTED', updated_at = NOW() WHERE id = $1 AND status = 'PENDING'`,
            [rechargeId]
        );
        res.json({ message: 'Recharge rejected successfully.' });
    } catch (error: any) {
        console.error('Error rejecting recharge:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getPendingRecharges = async (req: AuthRequest, res: Response) => {
    try {
        const role = req.user?.role;
        const userId = req.user?.id;
        let query = `
            SELECT sd.*, u.full_name as user_name, u.phone_number, u.email 
            FROM sinpe_deposits sd 
            JOIN users u ON sd.user_id = u.id 
            WHERE sd.status = 'PENDING'
        `;
        const params: any[] = [];
        if (role === 'FRANCHISE') {
            query += ` AND u.franchise_id = $1`;
            params.push(userId);
        } else {
            query += ` AND u.franchise_id IS NULL`;
        }
        query += ` ORDER BY sd.created_at DESC`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching pending recharges:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const adjustWalletBalance = async (req: AuthRequest, res: Response) => {
    const { userId, amount, type, description, target_balance = 'balance' } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const balanceField = target_balance === 'bonus' ? 'bonus_balance' : 'balance';
        const walletRes = await client.query(`SELECT id FROM wallets WHERE user_id = $1 FOR UPDATE`, [userId]);
        if (walletRes.rows.length === 0) throw new Error('Wallet not found');
        const walletId = walletRes.rows[0].id;

        await client.query(
            `UPDATE wallets SET ${balanceField} = ${balanceField} + $1, updated_at = NOW() WHERE id = $2`,
            [type === 'CREDIT' ? amount : -amount, walletId]
        );

        await client.query(
            `INSERT INTO wallet_transactions (wallet_id, type, amount, description) 
             VALUES ($1, $2, $3, $4)`,
            [walletId, target_balance === 'bonus' ? 'BONUS' : (type === 'CREDIT' ? 'DEPOSIT' : 'WITHDRAW'), amount, description]
        );

        await client.query('COMMIT');
        res.json({ message: 'Balance adjusted successfully.' });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error adjusting balance:', error);
        res.status(500).json({ error: error.message });
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
        console.error('Error fetching pending withdrawals:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const approveWithdrawal = async (req: AuthRequest, res: Response) => {
    const { withdrawalId } = req.params;
    const { status, admin_notes } = req.body;
    const adminId = req.user?.id;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const withdrawalRes = await client.query(`SELECT * FROM withdrawal_requests WHERE id = $1 FOR UPDATE`, [withdrawalId]);
        if (withdrawalRes.rows.length === 0) throw new Error('Withdrawal not found.');
        const withdrawal = withdrawalRes.rows[0];
        if (withdrawal.status !== 'PENDING') throw new Error('Already processed.');

        if (status === 'REJECTED') {
            await client.query(`UPDATE wallets SET balance = balance + $1 WHERE user_id = $2`, [withdrawal.amount, withdrawal.user_id]);
            await client.query(
                `INSERT INTO wallet_transactions (wallet_id, type, amount, description) 
                 SELECT id, 'REFUND', $1, 'Retiro RECHAZADO - Reembolso' FROM wallets WHERE user_id = $2`,
                [withdrawal.amount, withdrawal.user_id]
            );
        }

        await client.query(
            `UPDATE withdrawal_requests SET status = $1, processed_by = $2, admin_notes = $3, updated_at = NOW() WHERE id = $4`,
            [status, adminId, admin_notes, withdrawalId]
        );

        await client.query('COMMIT');
        res.json({ message: `Withdrawal ${status.toLowerCase()} successfully.` });
    } catch (e: any) {
        await client.query('ROLLBACK');
        console.error('Error approving withdrawal:', e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
};

export const getDepositHistory = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const result = await pool.query(
            `SELECT * FROM sinpe_deposits WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
            [userId]
        );
        res.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching deposit history:', error);
        res.status(500).json({ error: 'Error al obtener historial de depósitos' });
    }
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
    } catch (error: any) {
        console.error('Error fetching winnings history:', error);
        res.status(500).json({ error: 'Error al obtener historial de premios' });
    }
};