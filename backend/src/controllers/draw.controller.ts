import { Request, Response } from 'express';
import { pool } from '../index';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendWinnerNotificationEmail } from '../services/email.service';

// Formula: bet_amount * 90
const PAYOUT_MULTIPLIER = 90;

export const createDraw = async (req: AuthRequest, res: Response) => {
    // Admin only
    const { lottery_type, draw_date, draw_time } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO draws (lottery_type, draw_date, draw_time, status) VALUES ($1, $2, $3, 'OPEN') RETURNING *`,
            [lottery_type, draw_date, draw_time]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating draw:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const setWinningNumber = async (req: AuthRequest, res: Response) => {
    // Admin only
    const { drawId } = req.params;
    const { winning_number } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Close draw if not closed
        const drawRes = await client.query(
            `UPDATE draws SET status = 'FINISHED', winning_number = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [winning_number, drawId]
        );

        if (drawRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Draw not found.' });
        }

        const draw = drawRes.rows[0];

        // 1. Find winning bet items
        const winningItemsRes = await client.query(
            `SELECT bi.id, bi.bet_id, bi.amount, b.user_id, u.email 
             FROM bet_items bi
             JOIN bets b ON bi.bet_id = b.id
             JOIN users u ON b.user_id = u.id
             WHERE b.draw_id = $1 AND bi.number = $2 AND bi.status = 'PENDING'`,
            [drawId, winning_number]
        );

        const winningItems = winningItemsRes.rows;

        // Process Winnings
        for (const item of winningItems) {
            const prize = item.amount * PAYOUT_MULTIPLIER;

            // Update Bet Item
            await client.query(`UPDATE bet_items SET status = 'WON', prize = $1 WHERE id = $2`, [prize, item.id]);

            // Insert into Winnings
            await client.query(
                `INSERT INTO winnings (bet_item_id, user_id, draw_id, amount) VALUES ($1, $2, $3, $4)`,
                [item.id, item.user_id, drawId, prize]
            );

            // Update user wallet
            const walletRes = await client.query(
                `UPDATE wallets SET balance = balance + $1, total_winnings = total_winnings + $1, updated_at = NOW() WHERE user_id = $2 RETURNING id`,
                [prize, item.user_id]
            );

            // Add Wallet transaction
            await client.query(
                `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id) VALUES ($1, 'WIN', $2, 'Prize Winnings', $3)`,
                [walletRes.rows[0].id, prize, item.id]
            );

            // Send notification email
            if (item.email) {
                const drawInfo = `${draw.lottery_type} - ${draw.draw_date} ${draw.draw_time}`;
                try {
                    await sendWinnerNotificationEmail(item.email, drawInfo, winning_number as string, prize);
                } catch (e) {
                    console.warn('Failed to send winner email:', e);
                }
            }
        }

        // Set all other items to LOST
        await client.query(
            `UPDATE bet_items bi
             SET status = 'LOST'
             FROM bets b
             WHERE bi.bet_id = b.id AND b.draw_id = $1 AND bi.number != $2 AND bi.status = 'PENDING'`,
            [drawId, winning_number]
        );

        // Update overall bet status (WON if at least one item won, else LOST)
        await client.query(
            `UPDATE bets b
             SET status = CASE 
                WHEN EXISTS (SELECT 1 FROM bet_items bi WHERE bi.bet_id = b.id AND bi.status = 'WON') THEN 'WON'
                ELSE 'LOST'
             END
             WHERE b.draw_id = $1 AND b.status = 'ACTIVE'`,
            [drawId]
        );

        await client.query('COMMIT');
        res.json({ message: 'Winning registered and payouts processed.', winnersCount: winningItems.length, draw });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error processing winnings:', error);
        res.status(500).json({ error: 'Internal server error while processing payouts.' });
    } finally {
        client.release();
    }
};

export const getDraws = async (req: Request, res: Response) => {
    try {
        // Asegurar que los sorteos de hoy se muestren correctamente
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
        
        const result = await pool.query(`
            SELECT d.*, COALESCE(SUM(b.total_amount), 0) as total_sold
            FROM draws d
            LEFT JOIN bets b ON d.id = b.draw_id AND b.status != 'CANCELLED'
            WHERE d.draw_date >= $1 
              AND (d.draw_date > $1 OR d.draw_time >= CURRENT_TIME)
            GROUP BY d.id
            ORDER BY d.draw_date ASC, d.draw_time ASC
        `, [today]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching draws:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const cancelDraw = async (req: AuthRequest, res: Response) => {
    const { drawId } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Get Draw info and ensure it's cancelable
        const drawRes = await client.query(`SELECT * FROM draws WHERE id = $1`, [drawId]);
        if (drawRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Draw not found.' });
        }

        const draw = drawRes.rows[0];
        if (draw.status === 'FINISHED' || draw.status === 'CANCELLED') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Cannot cancel a draw with status ${draw.status}` });
        }

        // 2. Find all active bets for this draw to refund
        const betsToRefund = await client.query(
            `SELECT id, user_id, total_amount FROM bets WHERE draw_id = $1 AND status = 'ACTIVE'`,
            [drawId]
        );

        for (const bet of betsToRefund.rows) {
            // Refund wallet
            const walletRes = await client.query(
                `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2 RETURNING id`,
                [bet.total_amount, bet.user_id]
            );

            // Record transaction
            await client.query(
                `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id) 
                 VALUES ($1, 'REFUND', $2, $3, $4)`,
                [walletRes.rows[0].id, bet.total_amount, `Refund for cancelled draw: ${draw.lottery_type} ${draw.draw_time}`, bet.id]
            );
            
            // Update bet status
            await client.query(`UPDATE bets SET status = 'CANCELLED' WHERE id = $1`, [bet.id]);
        }

        // 3. Update draw status
        await client.query(`UPDATE draws SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`, [drawId]);

        await client.query('COMMIT');
        res.json({ message: 'Draw cancelled successfully and all bets refunded.', refundedBets: betsToRefund.rows.length });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error cancelling draw:', error);
        res.status(500).json({ error: 'Internal server error while cancelling draw.' });
    } finally {
        client.release();
    }
};
