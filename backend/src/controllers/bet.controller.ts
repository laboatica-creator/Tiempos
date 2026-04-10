import { Request, Response } from 'express';
import { pool } from '../database/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendTicketPurchaseEmail } from '../services/email.service';

const MAX_BET_PER_NUMBER_PER_USER = 20000;
const MAX_TOTAL_BET_PER_NUMBER_PER_DRAW = 100000;
const PAYOUT_MULTIPLIER = 90;

export const placeBet = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { draw_id, bets } = req.body; 

    if (!draw_id || !bets || !Array.isArray(bets) || bets.length === 0) {
        return res.status(400).json({ error: 'Formato de apuesta inválido.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Verificar sorteo
        const drawRes = await client.query(`SELECT status, draw_date, draw_time, lottery_type FROM draws WHERE id = $1 FOR SHARE`, [draw_id]);
        if (drawRes.rows.length === 0 || drawRes.rows[0].status !== 'OPEN') {
            throw new Error('El sorteo no está abierto para apuestas.');
        }

        let totalAmount = 0;
        for (const b of bets) {
            if (b.amount < 100) throw new Error('Monto mínimo por número es ₡100');
            totalAmount += b.amount;
            
            // Risk check
            const exposureRes = await client.query(
                `SELECT current_exposure, max_exposure, is_closed FROM draw_exposure WHERE draw_id = $1 AND number = $2 FOR UPDATE`,
                [draw_id, b.number]
            );
            
            if (exposureRes.rows.length > 0) {
                const exp = exposureRes.rows[0];
                if (exp.is_closed || (Number(exp.current_exposure) + b.amount) > Number(exp.max_exposure)) {
                    throw new Error(`El número ${b.number} ha alcanzado el límite de apuestas.`);
                }
            }
        }

        // 2. Gestionar Billetera (Consumir bono primero)
        const walletRes = await client.query(`SELECT balance, bonus_balance FROM wallets WHERE user_id = $1 FOR UPDATE`, [userId]);
        const wallet = walletRes.rows[0];
        const totalAvailable = Number(wallet.balance) + Number(wallet.bonus_balance);
        
        if (totalAvailable < totalAmount) throw new Error('Saldo insuficiente (incluyendo bonos).');

        const bonusUsed = Math.min(Number(wallet.bonus_balance), totalAmount);
        const balanceUsed = totalAmount - bonusUsed;

        await client.query(
            `UPDATE wallets SET 
                balance = balance - $1, 
                bonus_balance = bonus_balance - $2, 
                total_bets = total_bets + $3, 
                updated_at = NOW() 
             WHERE user_id = $4`,
            [balanceUsed, bonusUsed, totalAmount, userId]
        );

        // 3. Crear Apuesta
        const betTicketRes = await client.query(
            `INSERT INTO bets (user_id, draw_id, total_amount, bonus_amount, status) 
             VALUES ($1, $2, $3, $4, 'ACTIVE') RETURNING id`,
            [userId, draw_id, totalAmount, bonusUsed]
        );
        const betId = betTicketRes.rows[0].id;

        for (const b of bets) {
            await client.query(
                `INSERT INTO bet_items (bet_id, number, amount, status) VALUES ($1, $2, $3, 'PENDING')`,
                [betId, b.number, b.amount]
            );
            await client.query(
                `INSERT INTO draw_exposure (draw_id, number, current_exposure) VALUES ($1, $2, $3)
                 ON CONFLICT (draw_id, number) DO UPDATE SET current_exposure = draw_exposure.current_exposure + $3`,
                [draw_id, b.number, b.amount]
            );
        }

        await client.query(
            `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id) 
             VALUES ((SELECT id FROM wallets WHERE user_id = $1), 'BET', $2, $3, $4)`,
            [userId, totalAmount, `Apuesta realizada - Sorteo ${draw_id}`, betId]
        );

        await client.query('COMMIT');
        res.status(201).json({ message: 'Apuesta realizada con éxito', bet_id: betId });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('PLACE BET ERROR:', error);
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
};

export const getUserBets = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { date } = req.query;
        let query = `
            SELECT b.*, d.lottery_type, d.draw_date, d.draw_time,
            (SELECT json_agg(bi.*) FROM bet_items bi WHERE bi.bet_id = b.id) as items
            FROM bets b
            JOIN draws d ON b.draw_id = d.id
            WHERE b.user_id = $1
        `;
        const params: any[] = [userId];
        if (date) {
            query += ` AND DATE(b.created_at) = $2`;
            params.push(date);
        }
        query += ` ORDER BY b.created_at DESC LIMIT 50`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener apuestas' });
    }
};

export const cancelBet = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { betId } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const betRes = await client.query(
            `SELECT b.*, d.status as draw_status, d.draw_date, d.draw_time 
             FROM bets b JOIN draws d ON b.draw_id = d.id 
             WHERE b.id = $1 AND b.user_id = $2 FOR UPDATE`,
            [betId, userId]
        );

        if (betRes.rows.length === 0) throw new Error('Apuesta no encontrada.');
        const bet = betRes.rows[0];

        if (bet.status !== 'ACTIVE' || bet.draw_status !== 'OPEN') {
            throw new Error('No se puede cancelar esta apuesta.');
        }

        // Reembolsar respetando lo que fue bono
        const bonusRefund = Number(bet.bonus_amount || 0);
        const cashRefund = Number(bet.total_amount) - bonusRefund;

        const walletRes = await client.query(
            `UPDATE wallets SET 
                balance = balance + $1, 
                bonus_balance = bonus_balance + $2,
                total_bets = total_bets - $3,
                updated_at = NOW() 
             WHERE user_id = $4 RETURNING id`,
            [cashRefund, bonusRefund, bet.total_amount, userId]
        );

        await client.query(
            `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id) 
             VALUES ($1, 'REFUND', $2, 'Apuesta cancelada - Reembolso', $3)`,
            [walletRes.rows[0].id, bet.total_amount, betId]
        );

        // Actualizar exposición
        const items = await client.query(`SELECT number, amount FROM bet_items WHERE bet_id = $1`, [betId]);
        for (const item of items.rows) {
            await client.query(
                `UPDATE draw_exposure SET current_exposure = current_exposure - $1 WHERE draw_id = $2 AND number = $3`,
                [item.amount, bet.draw_id, item.number]
            );
        }

        await client.query(`UPDATE bets SET status = 'CANCELLED' WHERE id = $1`, [betId]);
        await client.query(`UPDATE bet_items SET status = 'CANCELLED' WHERE bet_id = $1`, [betId]);

        await client.query('COMMIT');
        res.json({ message: 'Apuesta cancelada y saldo devuelto.' });
    } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
};

export const getNumberExposure = async (req: Request, res: Response) => {
    // ... logic remains similar, ideally fetching from draw_exposure
    const { draw_id } = req.params;
    try {
        const result = await pool.query(`SELECT number, current_exposure FROM draw_exposure WHERE draw_id = $1`, [draw_id]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener exposición' });
    }
};