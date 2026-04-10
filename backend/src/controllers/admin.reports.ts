import { Response } from 'express';
import { pool } from '../database/db';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getDashboardReport = async (req: AuthRequest, res: Response) => {
    try {
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(new Date());
        
        const queries = {
            total_sales: `SELECT COALESCE(SUM(total_amount), 0) as sum FROM bets WHERE DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica') = $1 AND status != 'CANCELLED'`,
            total_players: `SELECT COUNT(*) as count FROM users WHERE role = 'CUSTOMER'`,
            sinpe_deposits_count: `SELECT COUNT(*) as count FROM sinpe_deposits WHERE status = 'PENDING'`,
            pending_withdrawals: `SELECT COUNT(*) as count FROM withdrawal_requests WHERE status = 'PENDING'`,
            sinpe_deposits_total: `SELECT COALESCE(SUM(amount), 0) as sum FROM sinpe_deposits WHERE DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica') = $1 AND status = 'APPROVED'`,
            total_winnings: `SELECT COALESCE(SUM(amount), 0) as sum FROM winnings WHERE DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica') >= $1`
        };
        
        const [sales, players, sinpeCount, withdrawals, sinpeTotal, winnings] = await Promise.all([
            pool.query(queries.total_sales, [today]),
            pool.query(queries.total_players),
            pool.query(queries.sinpe_deposits_count),
            pool.query(queries.pending_withdrawals),
            pool.query(queries.sinpe_deposits_total, [today]),
            pool.query(queries.total_winnings, [today.substring(0, 7) + '-01'])
        ]);

        res.json({
            total_sales: parseFloat(sales.rows[0].sum),
            total_players: parseInt(players.rows[0].count),
            sinpe_deposits_count: parseInt(sinpeCount.rows[0].count),
            pending_withdrawals: parseInt(withdrawals.rows[0].count),
            sinpe_deposits_total: parseFloat(sinpeTotal.rows[0].sum),
            total_winnings: parseFloat(winnings.rows[0].sum)
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Stats error' });
    }
};

export const getSalesReport = async (req: AuthRequest, res: Response) => {
    const { start_date, end_date } = req.query;
    try {
        const query = `
            SELECT 
                DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica') as date,
                COUNT(*) as total_bets,
                COALESCE(SUM(total_amount), 0) as total_amount,
                COUNT(DISTINCT user_id) as unique_players
            FROM bets
            WHERE DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica') BETWEEN $1 AND $2
                AND status != 'CANCELLED'
            GROUP BY DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica')
            ORDER BY date DESC
        `;
        const result = await pool.query(query, [start_date, end_date]);
        res.json(result.rows);
    } catch (err: any) {
        console.error('Sales report error:', err);
        res.status(500).json({ error: 'Error reporte ventas' });
    }
};

export const getPlayersReport = async (req: AuthRequest, res: Response) => {
    const { start_date, end_date, status } = req.query;
    try {
        let query = `
            SELECT 
                id, full_name as username, email, phone_number as phone, role, 
                CASE WHEN is_active THEN 'ACTIVO' ELSE 'INACTIVO' END as status,
                created_at as registered_date,
                (SELECT COUNT(*) FROM bets WHERE user_id = users.id) as total_bets,
                (SELECT COALESCE(SUM(total_amount), 0) FROM bets WHERE user_id = users.id) as total_bet_amount
            FROM users
            WHERE role = 'CUSTOMER' AND DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica') BETWEEN $1 AND $2
        `;
        
        if (status === 'ACTIVO') query = query.replace('WHERE', 'WHERE is_active = true AND');
        if (status === 'INACTIVO') query = query.replace('WHERE', 'WHERE is_active = false AND');
        
        query += ` ORDER BY created_at DESC`;
        
        const result = await pool.query(query, [start_date, end_date]);
        res.json(result.rows);
    } catch (err: any) {
        console.error('Players report error:', err);
        res.status(500).json({ error: 'Error reporte jugadores' });
    }
};

export const getSinpeDepositsReport = async (req: AuthRequest, res: Response) => {
    const { start_date, end_date } = req.query;
    try {
        const query = `
            SELECT 
                sd.id,
                sd.user_id,
                sd.amount,
                sd.reference_number,
                sd.sender_name,
                sd.method_type,
                sd.status,
                sd.created_at,
                u.full_name as user_name,
                u.email as user_email
            FROM sinpe_deposits sd
            JOIN users u ON sd.user_id = u.id
            WHERE DATE(sd.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica') BETWEEN $1 AND $2
            ORDER BY sd.created_at DESC
        `;
        const result = await pool.query(query, [start_date, end_date]);
        res.json(result.rows);
    } catch (err: any) {
        console.error('Sinpe report error:', err);
        res.status(500).json({ error: 'Error reporte sinpe' });
    }
};

export const getWithdrawalsReport = async (req: AuthRequest, res: Response) => {
    const { start_date, end_date, type } = req.query;
    try {
        let query = `
            SELECT 
                wr.id,
                wr.user_id,
                wr.amount,
                wr.method,
                wr.status,
                wr.created_at,
                u.full_name as user_name,
                u.email as user_email,
                u.phone_number as user_phone
            FROM withdrawal_requests wr
            JOIN users u ON wr.user_id = u.id
            WHERE DATE(wr.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica') BETWEEN $1 AND $2
        `;
        
        if (type === 'SINPE') query += ` AND wr.method = 'SINPE'`;
        if (type === 'IBAN') query += ` AND wr.method = 'IBAN'`;
        
        query += ` ORDER BY wr.created_at DESC`;
        
        const result = await pool.query(query, [start_date, end_date]);
        res.json(result.rows);
    } catch (err: any) {
        console.error('Withdrawals report error:', err);
        res.status(500).json({ error: 'Error reporte retiros' });
    }
};

export const getWinnersReport = async (req: AuthRequest, res: Response) => {
    const { start_date, end_date } = req.query;
    try {
        const query = `
            SELECT 
                w.id,
                w.user_id,
                w.draw_id,
                w.amount,
                w.created_at,
                u.full_name as user_name,
                u.email as user_email,
                u.phone_number as user_phone,
                d.lottery_type,
                d.draw_date,
                d.draw_time
            FROM winnings w
            JOIN users u ON w.user_id = u.id
            JOIN draws d ON w.draw_id = d.id
            WHERE DATE(w.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica') BETWEEN $1 AND $2
            ORDER BY w.created_at DESC
        `;
        const result = await pool.query(query, [start_date, end_date]);
        res.json(result.rows);
    } catch (err: any) {
        console.error('Winners report error:', err);
        res.status(500).json({ error: 'Error reporte premios' });
    }
};