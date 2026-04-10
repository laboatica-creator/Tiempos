import { Request, Response } from 'express';
import { pool } from '../database/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ScraperService } from '../services/scraper.service';

const PAYOUT_MULTIPLIER = 90;

export const createDraw = async (req: AuthRequest, res: Response) => {
    const { lottery_type, draw_date, draw_time, min_bet, max_bet, max_exposure_limit } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO draws (lottery_type, draw_date, draw_time, min_bet, max_bet, max_exposure_limit) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [lottery_type, draw_date, draw_time, min_bet || 100, max_bet || 20000, max_exposure_limit || 50000]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating draw:', error);
        res.status(500).json({ error: 'Internal server error' });
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

        query += ` ORDER BY d.draw_date ASC, d.draw_time ASC LIMIT 100`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching draws:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const setWinningNumber = async (req: AuthRequest, res: Response) => {
    const { drawId } = req.params;
    const { winning_number } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const drawRes = await client.query(
            `UPDATE draws SET winning_number = $1, status = 'FINISHED', updated_at = NOW() 
             WHERE id = $2 AND status IN ('OPEN', 'CLOSED') RETURNING *`,
            [winning_number, drawId]
        );

        if (drawRes.rows.length === 0) {
            throw new Error('Sorteo no encontrado o ya finalizado.');
        }

        const draw = drawRes.rows[0];

        const winningBets = await client.query(
            `SELECT bi.*, b.user_id 
             FROM bet_items bi
             JOIN bets b ON bi.bet_id = b.id
             WHERE b.draw_id = $1 AND bi.number = $2 AND b.status = 'ACTIVE'`,
            [drawId, winning_number]
        );

        for (const item of winningBets.rows) {
            const prize = Number(item.amount) * PAYOUT_MULTIPLIER;
            
            await client.query(
                `UPDATE wallets SET balance = balance + $1, total_winnings = total_winnings + $1, updated_at = NOW() 
                 WHERE user_id = $2`,
                [prize, item.user_id]
            );

            await client.query(
                `INSERT INTO winnings (bet_item_id, user_id, draw_id, amount) VALUES ($1, $2, $3, $4)`,
                [item.id, item.user_id, drawId, prize]
            );

            await client.query(
                `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id) 
                 SELECT id, 'WIN', $1, $2, $3 FROM wallets WHERE user_id = $4`,
                [prize, `PREMIO: ${draw.lottery_type} ${draw.draw_time} (#${winning_number})`, drawId, item.user_id]
            );
            
            await client.query(`UPDATE bet_items SET status = 'WON', prize = $1 WHERE id = $2`, [prize, item.id]);
        }

        await client.query(
            `UPDATE bet_items SET status = 'LOST' 
             WHERE bet_id IN (SELECT id FROM bets WHERE draw_id = $1) AND number != $2`,
            [drawId, winning_number]
        );

        await client.query('COMMIT');
        res.json({ message: 'Número ganador registrado y premios pagados.', winners: winningBets.rows.length });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error setting winning number:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

export const cancelDraw = async (req: AuthRequest, res: Response) => {
    const { drawId } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const drawRes = await client.query(`SELECT status FROM draws WHERE id = $1 FOR UPDATE`, [drawId]);
        if (drawRes.rows.length === 0) throw new Error('Draw not found');
        if (drawRes.rows[0].status === 'FINISHED') throw new Error('Cannot cancel a finished draw');

        await client.query(`UPDATE draws SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`, [drawId]);

        const bets = await client.query(`SELECT id, user_id, total_amount, bonus_amount FROM bets WHERE draw_id = $1 AND status = 'ACTIVE'`, [drawId]);

        for (const bet of bets.rows) {
            const bonusRefund = Number(bet.bonus_amount);
            const balanceRefund = Number(bet.total_amount) - bonusRefund;

            await client.query(
                `UPDATE wallets SET balance = balance + $1, bonus_balance = bonus_balance + $2 WHERE user_id = $3`,
                [balanceRefund, bonusRefund, bet.user_id]
            );

            await client.query(`UPDATE bets SET status = 'CANCELLED' WHERE id = $1`, [bet.id]);
            
            await client.query(
                `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id) 
                 SELECT id, 'REFUND', $1, 'Sorteo Cancelado - Reembolso', $2 FROM wallets WHERE user_id = $3`,
                [bet.total_amount, drawId, bet.user_id]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Sorteo cancelado y apuestas devueltas.', total_refunded: bets.rows.length });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error cancelling draw:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};

// 🔥 CORREGIDA: Ahora pasa lottery_type al scraper
export const getSuggestedResults = async (req: AuthRequest, res: Response) => {
    try {
        const { drawId } = req.query;
        
        console.log('[SUGGESTIONS] drawId recibido:', drawId);
        
        if (!drawId) {
            return res.json({ number: null, message: 'Se requiere drawId' });
        }
        
        const draw = await pool.query(
            `SELECT lottery_type, draw_time, draw_date FROM draws WHERE id = $1`,
            [drawId]
        );
        
        console.log('[SUGGESTIONS] Sorteo encontrado:', draw.rows[0]);
        
        if (draw.rows.length === 0) {
            return res.json({ number: null, message: 'Sorteo no encontrado' });
        }
        
        const { lottery_type, draw_time, draw_date } = draw.rows[0];
        
        console.log(`[SUGGESTIONS] Buscando para ${lottery_type} a las ${draw_time} del ${draw_date}`);
        
        // 🔥 Pasar lottery_type al scraper
        const result = await ScraperService.getSuggestedResults(draw_time, draw_date, lottery_type);
        
        console.log('[SUGGESTIONS] Resultado del scraper:', result);
        
        res.json(result);
    } catch (error) {
        console.error('[SUGGESTIONS] Error:', error);
        res.json({ number: null, message: 'No se pudieron obtener sugerencias' });
    }
};