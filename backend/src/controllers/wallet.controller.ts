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
        res.status(500).json({ error: 'Error al registrar recarga' });
    }
};

export const getWalletTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { limit = 50, page = 1 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        // 🔥 UNIFICADO: Historial completo de Depósitos, Retiros y Movimientos de Billetera
        const query = `
            SELECT * FROM (
                (SELECT id, amount, 'DEPÓSITO SINPE' as type, status, created_at, 'SINPE' as method, reference_number as details FROM sinpe_deposits WHERE user_id = $1)
                UNION ALL
                (SELECT id, amount, 'RETIRO' as type, status, created_at, method, details FROM withdrawal_requests WHERE user_id = $1)
                UNION ALL
                (SELECT id, amount, type::text, 'COMPLETED' as status, created_at, 'SISTEMA' as method, description as details 
                 FROM wallet_transactions wt JOIN wallets w ON wt.wallet_id = w.id WHERE w.user_id = $1)
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

export const requestWithdrawal = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { amount, method, details } = req.body;
    
    if (!amount || amount <= 1000) return res.status(400).json({ error: 'Monto mínimo de retiro ₡1,000.' });

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
        res.status(500).json({ error: 'Error obteniendo métodos de pago' });
    }
};