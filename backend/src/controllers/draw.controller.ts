import { Request, Response } from 'express';
import { pool } from '../database/db';
import { AuthRequest } from '../middlewares/auth.middleware';

const PAYOUT_MULTIPLIER = 90;

export const createDraw = async (req: AuthRequest, res: Response) => {
    const { lottery_type, draw_date, draw_time } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO draws (lottery_type, draw_date, draw_time, status) 
             VALUES ($1, $2, $3, 'OPEN') RETURNING *`,
            [lottery_type, draw_date, draw_time]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear sorteo' });
    }
};

export const setWinningNumber = async (req: AuthRequest, res: Response) => {
    const { drawId } = req.params;
    const { winning_number } = req.body;
    const adminId = req.user?.id;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Finalizar sorteo
        const drawRes = await client.query(
            `UPDATE draws SET status = 'FINISHED', winning_number = $1, updated_at = NOW() 
             WHERE id = $2 AND status IN ('OPEN', 'CLOSED') RETURNING *`,
            [winning_number, drawId]
        );

        if (drawRes.rows.length === 0) throw new Error('Sorteo no encontrado o ya finalizado.');
        const draw = drawRes.rows[0];

        // Procesar ganadores
        const winners = await client.query(
            `SELECT bi.id, bi.amount, b.user_id 
             FROM bet_items bi 
             JOIN bets b ON bi.bet_id = b.id 
             WHERE b.draw_id = $1 AND bi.number = $2 AND bi.status = 'PENDING'`,
            [drawId, winning_number]
        );

        for (const row of winners.rows) {
            const prize = Number(row.amount) * PAYOUT_MULTIPLIER;
            
            await client.query(`UPDATE bet_items SET status = 'WON', prize = $1 WHERE id = $2`, [prize, row.id]);
            await client.query(
                `INSERT INTO winnings (bet_item_id, user_id, draw_id, amount) VALUES ($1, $2, $3, $4)`,
                [row.id, row.user_id, drawId, prize]
            );

            const walletRes = await client.query(
                `UPDATE wallets SET balance = balance + $1, total_winnings = total_winnings + $1, updated_at = NOW() 
                 WHERE user_id = $2 RETURNING id`,
                [prize, row.user_id]
            );

            await client.query(
                `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id) 
                 VALUES ($1, 'WIN', $2, $3, $4)`,
                [walletRes.rows[0].id, prize, `Premio sorteo ${draw.lottery_type} #${draw.id}`, row.id]
            );
        }

        // Marcar perdedores
        await client.query(
            `UPDATE bet_items SET status = 'LOST' WHERE bet_id IN (SELECT id FROM bets WHERE draw_id = $1) 
             AND number != $2 AND status = 'PENDING'`,
            [drawId, winning_number]
        );
        
        await client.query(
            `UPDATE bets SET status = 'FINISHED' WHERE draw_id = $1 AND status = 'ACTIVE'`,
            [drawId]
        );

        await client.query('COMMIT');
        res.json({ message: 'Resultados procesados correctamente', winners: winners.rowCount });
    } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
};

export const getDraws = async (req: Request, res: Response) => {
    try {
        const { date, status } = req.query;
        const timeZone = 'America/Costa_Rica';
        const today = new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());

        let query = `
            SELECT d.*, 
            (SELECT COALESCE(SUM(total_amount), 0) FROM bets WHERE draw_id = d.id AND status != 'CANCELLED') as total_sold
            FROM draws d 
            WHERE 1=1
        `;
        const params: any[] = [];
        
        if (date) {
            params.push(date);
            query += ` AND d.draw_date = $${params.length}`;
        } else if (status === 'ACTIVE') {
            params.push(today);
            query += ` AND d.draw_date >= $${params.length} AND d.status IN ('OPEN', 'CLOSED')`;
        }

        if (status && status !== 'ACTIVE') {
            params.push(status);
            query += ` AND d.status = $${params.length}`;
        }

        query += ` ORDER BY d.draw_date DESC, d.draw_time DESC LIMIT 100`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener sorteos' });
    }
};

export const cancelDraw = async (req: AuthRequest, res: Response) => {
    const { drawId } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const drawRes = await client.query(`SELECT status FROM draws WHERE id = $1 FOR UPDATE`, [drawId]);
        if (drawRes.rows.length === 0) throw new Error('Draw not found.');
        if (drawRes.rows[0].status === 'FINISHED') throw new Error('Cannot cancel a finished draw.');

        // Devolver dinero de todas las apuestas activas
        const bets = await client.query(`SELECT id, user_id, total_amount, bonus_amount FROM bets WHERE draw_id = $1 AND status = 'ACTIVE'`, [drawId]);
        for (const bet of bets.rows) {
            const bonusAmount = Number(bet.bonus_amount || 0);
            const cashAmount = Number(bet.total_amount) - bonusAmount;

            await client.query(
                `UPDATE wallets SET balance = balance + $1, bonus_balance = bonus_balance + $2 
                 WHERE user_id = $3`,
                [cashAmount, bonusAmount, bet.user_id]
            );
            
            await client.query(`UPDATE bets SET status = 'CANCELLED' WHERE id = $1`, [bet.id]);
        }

        await client.query(`UPDATE draws SET status = 'CANCELLED' WHERE id = $1`, [drawId]);
        await client.query('COMMIT');
        res.json({ message: 'Sorteo cancelado y reembolsos procesados.' });
    } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
};
