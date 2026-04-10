import { Request, Response } from 'express';
import { pool } from '../database/db';
import { AuthRequest } from '../middlewares/auth.middleware';

/**
 * Obtener sorteos con filtros flexibles
 */
export const getDraws = async (req: Request, res: Response) => {
    try {
        const { date, status, include_finished } = req.query;
        const CTZ = 'America/Costa_Rica';
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: CTZ }).format(new Date());
        
        let query = `
            SELECT 
                d.*, 
                (SELECT COALESCE(SUM(total_amount), 0) FROM bets WHERE draw_id = d.id AND status != 'CANCELLED') as total_sold 
            FROM draws d 
            WHERE 1=1
        `;
        
        const params: any[] = [];

        if (date) {
            params.push(date);
            query += ` AND d.draw_date = $${params.length}`;
        } else if (status === 'ACTIVE') {
            // Sorteos de hoy en adelante que no han finalizado
            params.push(today);
            query += ` AND d.draw_date >= $${params.length} AND d.status IN ('OPEN', 'CLOSED')`;
        } else if (!include_finished && !date) {
            // Por defecto, mostrar sorteos recientes o activos
            params.push(today);
            query += ` AND d.draw_date >= $${params.length}`;
        }
        
        query += ` ORDER BY d.draw_date ASC, d.draw_time ASC LIMIT 100`;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching draws:', error);
        res.status(500).json({ error: 'Error al obtener los sorteos' });
    }
};

/**
 * Crear un nuevo sorteo manualmente (Admin)
 */
export const createDraw = async (req: AuthRequest, res: Response) => {
  const { lottery_type, draw_date, draw_time, max_exposure_limit, min_bet, max_bet } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO draws (lottery_type, draw_date, draw_time, status, max_exposure_limit, min_bet, max_bet) 
       VALUES ($1, $2, $3, 'OPEN', $4, $5, $6) RETURNING *`,
      [lottery_type, draw_date, draw_time, max_exposure_limit || 50000, min_bet || 100, max_bet || 20000]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating draw:', error);
    res.status(500).json({ error: 'Error al crear sorteo', details: error.message });
  }
};

/**
 * Registrar número ganador y liquidar premios
 */
export const setWinningNumber = async (req: AuthRequest, res: Response) => {
    const { drawId } = req.params;
    const { winning_number } = req.body;
    const adminId = req.user?.id;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Obtener datos del sorteo
        const drawRes = await client.query(`SELECT * FROM draws WHERE id = $1 FOR UPDATE`, [drawId]);
        const draw = drawRes.rows[0];

        if (!draw) throw new Error('Sorteo no encontrado.');
        if (draw.status === 'FINISHED') throw new Error('Este sorteo ya ha sido finalizado.');

        // 2. Actualizar sorteo
        await client.query(
            `UPDATE draws SET status = 'FINISHED', winning_number = $1, updated_at = NOW() WHERE id = $2`,
            [winning_number, drawId]
        );

        // 3. Buscar ganadores
        const winnersRes = await client.query(`
            SELECT bi.*, b.user_id, b.id as bet_id
            FROM bet_items bi
            JOIN bets b ON bi.bet_id = b.id
            WHERE b.draw_id = $1 AND bi.number = $2 AND b.status = 'ACTIVE'
        `, [drawId, winning_number]);

        const winnings_count = winnersRes.rows.length;

        // 4. Procesar cada ganador
        const PAYOUT_MULTIPLIER = 90; // Configurable
        for (const winner of winnersRes.rows) {
            const prizeAmount = Number(winner.amount) * PAYOUT_MULTIPLIER;
            
            // Actualizar billetera
            await client.query(`UPDATE wallets SET balance = balance + $1 WHERE user_id = $2`, [prizeAmount, winner.user_id]);
            
            // Registrar transacción
            await client.query(`
                INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
                SELECT id, 'WIN', $1, $2, $3 FROM wallets WHERE user_id = $4
            `, [prizeAmount, `PREMIO: ${draw.lottery_type} ${draw.draw_time} (#${winning_number})`, winner.bet_id, winner.user_id]);
            
            // Registrar en winnings
            await client.query(`
                INSERT INTO winnings (bet_item_id, user_id, draw_id, amount)
                VALUES ($1, $2, $3, $4)
            `, [winner.id, winner.user_id, drawId, prizeAmount]);
            
            // Marcar item como ganado
            await client.query(`UPDATE bet_items SET status = 'WON', prize = $1 WHERE id = $2`, [prizeAmount, winner.id]);
        }

        // 5. Marcar todos los demás como perdidos
        await client.query(`
            UPDATE bet_items 
            SET status = 'LOST' 
            WHERE bet_id IN (SELECT id FROM bets WHERE draw_id = $1) 
            AND number != $2
        `, [drawId, winning_number]);

        // Registrar acción administrativa
        await client.query(`
            INSERT INTO admin_logs (admin_id, action, details)
            VALUES ($1, $2, $3)
        `, [adminId, 'SET_WINNER', JSON.stringify({ drawId, winning_number, winners: winnings_count })]);

        await client.query('COMMIT');
        res.json({ success: true, message: `Sorteo liquidado. ${winnings_count} ganadores pagados.` });
    } catch (e: any) {
        await client.query('ROLLBACK');
        console.error('Error liquidating draw:', e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
};

/**
 * Cancelar sorteo y reembolsar apuestas (sin lavado de dinero)
 */
export const cancelDraw = async (req: AuthRequest, res: Response) => {
    const { drawId } = req.params;
    const adminId = req.user?.id;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const drawRes = await client.query(`SELECT * FROM draws WHERE id = $1 FOR UPDATE`, [drawId]);
        const draw = drawRes.rows[0];
        if (!draw) throw new Error('Sorteo no encontrado');
        if (draw.status === 'FINISHED') throw new Error('No se puede cancelar un sorteo finalizado.');

        const betsRes = await client.query(`SELECT * FROM bets WHERE draw_id = $1 AND status = 'ACTIVE'`, [drawId]);

        for (const bet of betsRes.rows) {
            const bonusRefund = Number(bet.bonus_amount);
            const cashRefund = Number(bet.total_amount) - bonusRefund;

            await client.query(
                `UPDATE wallets SET balance = balance + $1, bonus_balance = bonus_balance + $2 WHERE user_id = $3`,
                [cashRefund, bonusRefund, bet.user_id]
            );

            await client.query(`UPDATE bets SET status = 'CANCELLED' WHERE id = $1`, [bet.id]);
        }

        await client.query(`UPDATE draws SET status = 'CANCELLED' WHERE id = $1`, [drawId]);
        
        await client.query(`
            INSERT INTO admin_logs (admin_id, action, details)
            VALUES ($1, $2, $3)
        `, [adminId, 'CANCEL_DRAW', JSON.stringify({ drawId, bets_cancelled: betsRes.rows.length })]);

        await client.query('COMMIT');
        res.json({ message: `Sorteo cancelado y ${betsRes.rows.length} apuestas reembolsadas.` });
    } catch (e: any) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
};