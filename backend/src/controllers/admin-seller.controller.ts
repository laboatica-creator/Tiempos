import { Response } from 'express';
import { pool } from '../index';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getSellers = async (req: AuthRequest, res: Response) => {
    try {
        // 🔥 FIX: Mostrar ventas totales acumuladas para evitar el 'Cero' si hoy no ha vendido
        const result = await pool.query(`
            SELECT u.id, u.full_name, u.email, u.phone_number, u.is_active, u.created_at,
            (SELECT COALESCE(SUM(total_amount), 0) FROM bets WHERE seller_id = u.id) as total_life_sales,
            (SELECT COALESCE(SUM(total_amount), 0) FROM bets WHERE seller_id = u.id AND DATE(created_at) = CURRENT_DATE) as sales_today
            FROM users u WHERE u.role = 'SELLER'
            ORDER BY u.full_name ASC
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener vendedores' });
    }
};

export const getSellerDetail = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { start, end } = req.query;
    
    // Si no hay fechas, por defecto los últimos 30 días para no mostrar CERO
    const dateStart = start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateEnd = end || new Date().toISOString().split('T')[0];

    try {
        const seller = await pool.query(`SELECT id, full_name, email, phone_number, is_active, commission_percentage FROM users WHERE id = $1`, [id]);
        if (seller.rows.length === 0) return res.status(404).json({ error: 'Vendedor no encontrado' });

        const bets = await pool.query(`
            SELECT b.*, d.draw_date, d.draw_time, d.lottery_type
            FROM bets b
            JOIN draws d ON b.draw_id = d.id
            WHERE b.seller_id = $1 AND DATE(b.created_at) BETWEEN $2 AND $3
            ORDER BY b.created_at DESC
        `, [id, dateStart, dateEnd]);

        const totals = await pool.query(`
            SELECT 
                COALESCE(SUM(total_amount), 0) as total_sales,
                COALESCE(SUM(prize_amount), 0) as total_prizes,
                COUNT(*) as total_count
            FROM bets
            WHERE seller_id = $1 AND DATE(created_at) BETWEEN $2 AND $3
        `, [id, dateStart, dateEnd]);

        res.json({
            seller: seller.rows[0],
            bets: bets.rows,
            totals: totals.rows[0],
            period: { start: dateStart, end: dateEnd }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener detalle' });
    }
};

export const payPrize = async (req: AuthRequest, res: Response) => {
    const { betId } = req.params;
    try {
        await pool.query(`UPDATE bets SET prize_paid = true, prize_paid_at = NOW() WHERE id = $1`, [betId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al pagar premio' });
    }
};

export const liquidatePeriod = async (req: AuthRequest, res: Response) => {
    const { seller_id, start_date, end_date, commission_pct } = req.body;
    const admin_id = req.user?.id;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const totals = await client.query(`
            SELECT SUM(total_amount) as sales, SUM(prize_amount) as prizes
            FROM bets WHERE seller_id = $1 AND DATE(created_at) BETWEEN $2 AND $3
        `, [seller_id, start_date, end_date]);

        const sales = Number(totals.rows[0].sales || 0);
        const prizes = Number(totals.rows[0].prizes || 0);
        const commission = sales * (commission_pct / 100);
        const net = sales - prizes - commission;

        await client.query(`
            INSERT INTO seller_liquidations (seller_id, admin_id, start_date, end_date, total_sales, total_prizes, commission_percentage, commission_amount, net_amount, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'paid')
        `, [seller_id, admin_id, start_date, end_date, sales, prizes, commission_pct, commission, net]);

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error al liquidar' });
    } finally {
        client.release();
    }
};

export const toggleSellerStatus = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { is_active } = req.body;
    try {
        await pool.query(`UPDATE users SET is_active = $1 WHERE id = $2`, [is_active, id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al cambiar estado' });
    }
};