import { Request, Response } from 'express';
import { pool } from '../index';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendTicketPurchaseEmail } from '../services/email.service';

const MAX_BET_PER_NUMBER_PER_USER = 20000;
const MAX_TOTAL_BET_PER_NUMBER_PER_DRAW = 50000;
const PAYOUT_MULTIPLIER = 90;

export const placeBet = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { draw_id, bets } = req.body; // bets: Array of { number: string, amount: number }

    if (!draw_id || !bets || !Array.isArray(bets) || bets.length === 0) {
        return res.status(400).json({ error: 'Invalid bet request format.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Verify Draw is OPEN
        const drawRes = await client.query(`SELECT lottery_type, draw_date, draw_time, status FROM draws WHERE id = $1`, [draw_id]);
        if (drawRes.rows.length === 0 || drawRes.rows[0].status !== 'OPEN') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Draw is not open for betting.' });
        }

        let totalBetAmount = 0;

        // Process each bet item
        for (const bet of bets) {
            const { number, amount } = bet;

            if (amount < 200) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: `Minimum bet is 200 CRC per number. (Number ${number})` });
            }

            if (amount > MAX_BET_PER_NUMBER_PER_USER) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: `Maximum bet per number per user is 20000 CRC. (Number ${number})` });
            }

            // DB Risk Management check (Scalable & Consistent)
            // Upsert with Row Lock
            const exposureRes = await client.query(
                `INSERT INTO draw_exposure (draw_id, number, current_exposure) 
                 VALUES ($1, $2, $3)
                 ON CONFLICT (draw_id, number) 
                 DO UPDATE SET current_exposure = draw_exposure.current_exposure 
                 RETURNING current_exposure, max_exposure, is_closed`,
                [draw_id, number, 0] // Start with 0 if new
            );

            // Now lock it specifically
            const lockRes = await client.query(
                `SELECT current_exposure, max_exposure, is_closed FROM draw_exposure 
                 WHERE draw_id = $1 AND number = $2 FOR UPDATE`,
                [draw_id, number]
            );

            const { current_exposure, max_exposure, is_closed } = lockRes.rows[0];

            if (is_closed || (Number(current_exposure) + amount) > Number(max_exposure)) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: `Number ${number} has reached its limit or is closed.`,
                    available: Number(max_exposure) - Number(current_exposure)
                });
            }

            // Update Exposure
            await client.query(
                `UPDATE draw_exposure SET current_exposure = current_exposure + $1 WHERE draw_id = $2 AND number = $3`,
                [amount, draw_id, number]
            );

            totalBetAmount += amount;
        }

        // Deduct from Wallet
        const walletRes = await client.query(
            `UPDATE wallets SET balance = balance - $1, total_bets = total_bets + $1, updated_at = NOW() WHERE user_id = $2 AND balance >= $1 RETURNING id`,
            [totalBetAmount, userId]
        );

        if (walletRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Insufficient wallet balance.' });
        }

        const walletId = walletRes.rows[0].id;

        // Insert Bet Ticket
        const betTicketRes = await client.query(
            `INSERT INTO bets (user_id, draw_id, total_amount) VALUES ($1, $2, $3) RETURNING id`,
            [userId, draw_id, totalBetAmount]
        );
        const betTicketId = betTicketRes.rows[0].id;

        // Insert Bet Items
        for (const bet of bets) {
            await client.query(
                `INSERT INTO bet_items (bet_id, number, amount) VALUES ($1, $2, $3)`,
                [betTicketId, bet.number, bet.amount]
            );
        }

        // Log Transaction
        await client.query(
            `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id) VALUES ($1, 'BET', $2, 'Bet Placed', $3)`,
            [walletId, totalBetAmount, betTicketId]
        );

        await client.query('COMMIT');

        // Fetch User Email for Notification
        const userRes = await client.query(`SELECT email FROM users WHERE id = $1`, [userId]);
        if (userRes.rows.length > 0) {
            const userEmail = userRes.rows[0].email;
            const drawInfo = `${drawRes.rows[0].lottery_type} - ${drawRes.rows[0].draw_date} ${drawRes.rows[0].draw_time}`;
            try {
                await sendTicketPurchaseEmail(userEmail, drawInfo, bets, totalBetAmount);
            } catch (err) {
                console.warn('Error sending purchase email:', err);
            }
        }

        // WebSocket Notify (To be implemented)
        // req.app.get('io').emit('bet_placed', { user: userId, draw_id });

        res.status(201).json({ message: 'Bet placed successfully!', bet_id: betTicketId, totalAmount: totalBetAmount });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Bet placement error:', error);
        res.status(500).json({ error: 'Internal server error while placing bet.' });
    } finally {
        client.release();
    }
};

// Returns heat-map data for UI
export const getNumberExposure = async (req: Request, res: Response) => {
    const { draw_id } = req.params;
    try {
        const result = await pool.query(
            `SELECT number, current_exposure FROM draw_exposure WHERE draw_id = $1`,
            [draw_id]
        );
        const exposure: Record<string, number> = {};
        for (let i = 0; i <= 99; i++) {
            const numStr = i.toString().padStart(2, '0');
            exposure[numStr] = 0;
        }
        for (const row of result.rows) {
            exposure[row.number] = Number(row.current_exposure);
        }
        res.json({ draw_id, max_limit: MAX_TOTAL_BET_PER_NUMBER_PER_DRAW, exposure });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch exposure' });
    }
};

export const getUserBets = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { date } = req.query;
    
    let query = `
      SELECT 
        b.id,
        b.total_amount as amount,
        b.status,
        b.created_at,
        d.lottery_type,
        d.draw_date,
        d.draw_time,
        COALESCE(
          (SELECT json_agg(json_build_object('number', bi.number, 'amount', bi.amount)) FROM bet_items bi WHERE bi.bet_id = b.id),
          '[]'::json
        ) as items
      FROM bets b
      JOIN draws d ON b.draw_id = d.id
      WHERE b.user_id = $1
    `;
    
    const params: any[] = [userId];
    let paramCount = 1;
    
    if (date) {
      paramCount++;
      query += ` AND DATE(b.created_at) = $${paramCount}`;
      params.push(date);
    }
    
    query += ` ORDER BY b.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    console.log(`[BETS] Usuario ${userId} tiene ${result.rows.length} apuestas`);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user bets:', error);
    res.status(500).json({ error: 'Error al obtener historial de apuestas' });
  }
};

export const cancelBet = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { betId } = req.params;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Fetch bet and verify ownership + draw status
        const betRes = await client.query(
            `SELECT b.*, d.status as draw_status, d.draw_date, d.draw_time 
             FROM bets b 
             JOIN draws d ON b.draw_id = d.id 
             WHERE b.id = $1 AND b.user_id = $2`,
            [betId, userId]
        );

        if (betRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Bet not found or access denied.' });
        }

        const bet = betRes.rows[0];

        if (bet.status !== 'ACTIVE') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Cannot cancel a bet with status ${bet.status}` });
        }

        if (bet.draw_status !== 'OPEN') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Cannot cancel a bet for a closed or finished draw.' });
        }

        // 20 minute check
        const now = new Date();
        const [h, m] = bet.draw_time.split(':').map(Number);
        const drawDate = new Date(bet.draw_date);
        drawDate.setHours(h, m, 0, 0);
        const diff = (drawDate.getTime() - now.getTime()) / (1000 * 60);

        if (diff < 20) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No se puede anular o modificar una jugada a menos de 20 minutos del sorteo.' });
        }

        // 2. Refund wallet
        const walletRes = await client.query(
            `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2 RETURNING id`,
            [bet.total_amount, userId]
        );

        // Record transaction
        await client.query(
            `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id) 
             VALUES ($1, 'REFUND', $2, 'Bet Cancelled', $3)`,
            [walletRes.rows[0].id, bet.total_amount, betId]
        );

        // 3. Update Draw Exposure
        const itemsRes = await client.query(`SELECT number, amount FROM bet_items WHERE bet_id = $1`, [betId]);
        for (const item of itemsRes.rows) {
            await client.query(
                `UPDATE draw_exposure SET current_exposure = current_exposure - $1 WHERE draw_id = $2 AND number = $3`,
                [item.amount, bet.draw_id, item.number]
            );
        }

        // 4. Update status
        await client.query(`UPDATE bets SET status = 'CANCELLED' WHERE id = $1`, [betId]);
        await client.query(`UPDATE bet_items SET status = 'CANCELLED' WHERE bet_id = $1`, [betId]);

        await client.query('COMMIT');
        res.json({ message: 'Bet cancelled and refunded successfully.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error cancelling bet:', error);
        res.status(500).json({ error: 'Internal server error while cancelling bet.' });
    } finally {
        client.release();
    }
};