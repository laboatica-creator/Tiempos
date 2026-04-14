import { Request, Response } from 'express';
import { pool } from '../index';
import { AuthRequest } from '../middlewares/auth.middleware';

// Obtener todos los vendedores con sus totales básicos
export const getAllSellers = async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.id, u.full_name, u.email, u.phone_number, u.is_active, u.created_at,
                u.commission_percentage,
                COALESCE((SELECT SUM(total_amount) FROM bets WHERE seller_id = u.id AND created_at::date = CURRENT_DATE), 0) as sales_today
            FROM users u
            WHERE u.role = 'SELLER'
            ORDER BY u.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error in getAllSellers:', error);
        res.status(500).json({ error: 'Error al obtener vendedores' });
    }
};

// Estadísticas comparativas para el panel de administración
export const getAllSellersStats = async (req: AuthRequest, res: Response) => {
    try {
        const stats = await pool.query(`
            SELECT 
                u.id as seller_id,
                u.full_name as seller_name,
                COALESCE(SUM(CASE WHEN b.created_at::date = CURRENT_DATE THEN b.total_amount ELSE 0 END), 0) as total_sales_today,
                COALESCE(COUNT(CASE WHEN b.created_at::date = CURRENT_DATE THEN 1 END), 0) as total_bets_today,
                COALESCE(SUM(CASE WHEN b.created_at >= NOW() - INTERVAL '7 days' THEN b.total_amount ELSE 0 END), 0) as total_sales_week,
                COALESCE(SUM(CASE WHEN b.created_at >= NOW() - INTERVAL '30 days' THEN b.total_amount ELSE 0 END), 0) as total_sales_month
            FROM users u
            LEFT JOIN bets b ON u.id = b.seller_id
            WHERE u.role = 'SELLER'
            GROUP BY u.id, u.full_name
        `);
        res.json(stats.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener estadísticas de vendedores' });
    }
};

// Activar/Desactivar vendedor
export const toggleSellerStatus = async (req: AuthRequest, res: Response) => {
    const { sellerId } = req.params;
    const { is_active } = req.body;
    try {
        await pool.query('UPDATE users SET is_active = $1 WHERE id = $2 AND role = \'SELLER\'', [is_active, sellerId]);
        res.json({ success: true, message: `Vendedor ${is_active ? 'activado' : 'desactivado'}` });
    } catch (error) {
        res.status(500).json({ error: 'Error al cambiar estado' });
    }
};

// Detalle de ventas de un vendedor específico
export const getSellerSalesDetail = async (req: AuthRequest, res: Response) => {
    const { sellerId } = req.params;
    const { start, end } = req.query;
    try {
        const bets = await pool.query(`
            SELECT b.*, d.draw_date, d.draw_time, d.lottery_type,
                   (SELECT full_name FROM users WHERE id = b.user_id) as player_name
            FROM bets b
            JOIN draws d ON b.draw_id = d.id
            WHERE b.seller_id = $1
            AND b.created_at::date BETWEEN $2 AND $3
            ORDER BY b.created_at DESC
        `, [sellerId, start || '1900-01-01', end || '2100-12-31']);

        const totals = await pool.query(`
            SELECT 
                COUNT(*) as total_bets,
                COALESCE(SUM(total_amount), 0) as total_sales,
                COALESCE(SUM(prize_amount), 0) as total_prizes
            FROM bets
            WHERE seller_id = $1 AND created_at::date BETWEEN $2 AND $3
        `, [sellerId, start || '1900-01-01', end || '2100-12-31']);

        res.json({
            bets: bets.rows,
            totals: totals.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener detalle de ventas' });
    }
};

// Generar liquidación
export const liquidateSeller = async (req: AuthRequest, res: Response) => {
    const { seller_id, start_date, end_date, commission_percentage } = req.body;
    const adminId = req.user?.id;

    try {
        // Calcular totales del periodo
        const totals = await pool.query(`
            SELECT 
                COALESCE(SUM(total_amount), 0) as sales,
                COALESCE(SUM(prize_amount), 0) as prizes
            FROM bets
            WHERE seller_id = $1 AND created_at::date BETWEEN $2 AND $3
            AND status = 'ACTIVE'
        `, [seller_id, start_date, end_date]);

        const totalSales = Number(totals.rows[0].sales);
        const totalPrizes = Number(totals.rows[0].prizes);
        const commissionAmount = totalSales * (Number(commission_percentage) / 100);
        const netAmount = totalSales - totalPrizes - commissionAmount;

        const result = await pool.query(`
            INSERT INTO seller_liquidations (
                seller_id, admin_id, start_date, end_date, 
                total_sales, total_prizes, commission_percentage, 
                commission_amount, net_amount, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
            RETURNING *
        `, [seller_id, adminId, start_date, end_date, totalSales, totalPrizes, commission_percentage, commissionAmount, netAmount]);

        res.json({
            success: true,
            liquidation: result.rows[0],
            shortfall: netAmount < 0 ? Math.abs(netAmount) : 0
        });
    } catch (error) {
        console.error('Error in liquidateSeller:', error);
        res.status(500).json({ error: 'Error al procesar liquidación' });
    }
};

// Historial de liquidaciones
export const getSellerLiquidations = async (req: AuthRequest, res: Response) => {
    const { sellerId } = req.params;
    try {
        const result = await pool.query(`
            SELECT l.*, a.full_name as admin_name
            FROM seller_liquidations l
            JOIN users a ON l.admin_id = a.id
            WHERE l.seller_id = $1
            ORDER BY l.created_at DESC
        `, [sellerId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener historial de liquidaciones' });
    }
};

// Marcar liquidación como pagada
export const markLiquidationPaid = async (req: AuthRequest, res: Response) => {
    const { liquidationId } = req.params;
    try {
        await pool.query('UPDATE seller_liquidations SET status = \'paid\', paid_at = NOW() WHERE id = $1', [liquidationId]);
        res.json({ success: true, message: 'Liquidación marcada como pagada' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar liquidación' });
    }
};

// Pagar un premio individual
export const payPrize = async (req: AuthRequest, res: Response) => {
    const { betId } = req.params;
    try {
        const bet = await pool.query('SELECT prize_amount, prize_paid FROM bets WHERE id = $1', [betId]);
        if (bet.rows.length === 0) return res.status(404).json({ error: 'Apuesta no encontrada' });
        if (bet.rows[0].prize_paid) return res.status(400).json({ error: 'Premio ya pagado' });

        await pool.query('UPDATE bets SET prize_paid = true, prize_paid_at = NOW() WHERE id = $1', [betId]);
        res.json({ success: true, message: 'Premio marcado como pagado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al pagar premio' });
    }
};