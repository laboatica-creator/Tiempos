import { Request, Response } from 'express';
import { pool } from '../index';
import { AuthRequest } from '../middlewares/auth.middleware';

// Obtener todos los vendedores
export const getAllSellers = async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT id, full_name, email, phone_number, daily_sales, created_at, is_active
            FROM users
            WHERE role = 'SELLER'
            ORDER BY created_at DESC
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener vendedores:', error);
        res.status(500).json({ error: 'Error al obtener vendedores' });
    }
};

// Obtener estadísticas de todos los vendedores
export const getAllSellersStats = async (req: AuthRequest, res: Response) => {
    try {
        // Ventas de hoy por vendedor
        const todayStats = await pool.query(`
            SELECT 
                seller_id,
                COUNT(*) as total_bets,
                COALESCE(SUM(amount), 0) as total_sales
            FROM bets
            WHERE DATE(created_at) = CURRENT_DATE
            AND seller_id IS NOT NULL
            GROUP BY seller_id
        `);
        
        // Ventas de la semana por vendedor
        const weekStats = await pool.query(`
            SELECT 
                seller_id,
                COUNT(*) as total_bets,
                COALESCE(SUM(amount), 0) as total_sales
            FROM bets
            WHERE created_at > NOW() - INTERVAL '7 days'
            AND seller_id IS NOT NULL
            GROUP BY seller_id
        `);
        
        // Ventas del mes por vendedor
        const monthStats = await pool.query(`
            SELECT 
                seller_id,
                COUNT(*) as total_bets,
                COALESCE(SUM(amount), 0) as total_sales
            FROM bets
            WHERE created_at > NOW() - INTERVAL '30 days'
            AND seller_id IS NOT NULL
            GROUP BY seller_id
        `);
        
        // Obtener todos los vendedores
        const sellers = await pool.query(`
            SELECT id, full_name FROM users WHERE role = 'SELLER'
        `);
        
        // Combinar resultados
        const stats = sellers.rows.map(seller => {
            const today = todayStats.rows.find((s: any) => s.seller_id === seller.id);
            const week = weekStats.rows.find((s: any) => s.seller_id === seller.id);
            const month = monthStats.rows.find((s: any) => s.seller_id === seller.id);
            
            return {
                seller_id: seller.id,
                seller_name: seller.full_name,
                total_sales_today: today?.total_sales || 0,
                total_bets_today: today?.total_bets || 0,
                total_sales_week: week?.total_sales || 0,
                total_bets_week: week?.total_bets || 0,
                total_sales_month: month?.total_sales || 0,
                total_bets_month: month?.total_bets || 0
            };
        });
        
        res.json(stats);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};

// Activar/Desactivar vendedor
export const toggleSellerStatus = async (req: AuthRequest, res: Response) => {
    const { sellerId } = req.params;
    const { is_active } = req.body;
    
    try {
        const result = await pool.query(`
            UPDATE users 
            SET is_active = $1, updated_at = NOW()
            WHERE id = $2 AND role = 'SELLER'
            RETURNING id, full_name, is_active
        `, [is_active, sellerId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Vendedor no encontrado' });
        }
        
        res.json({
            success: true,
            message: `Vendedor ${is_active ? 'activado' : 'desactivado'} correctamente`,
            seller: result.rows[0]
        });
    } catch (error) {
        console.error('Error al cambiar estado:', error);
        res.status(500).json({ error: 'Error al cambiar estado del vendedor' });
    }
};

// Obtener ventas detalladas de un vendedor específico
export const getSellerSalesDetail = async (req: AuthRequest, res: Response) => {
    const { sellerId } = req.params;
    const { period = 'today', start_date, end_date } = req.query;
    
    try {
        let dateFilter = '';
        let params: any[] = [sellerId];
        
        if (start_date && end_date) {
            dateFilter = `AND DATE(created_at) BETWEEN $2 AND $3`;
            params.push(start_date, end_date);
        } else if (period === 'today') {
            dateFilter = `AND DATE(created_at) = CURRENT_DATE`;
        } else if (period === 'week') {
            dateFilter = `AND created_at > NOW() - INTERVAL '7 days'`;
        } else if (period === 'month') {
            dateFilter = `AND created_at > NOW() - INTERVAL '30 days'`;
        }
        
        const bets = await pool.query(`
            SELECT 
                b.*,
                u.full_name as player_name,
                d.draw_date,
                d.draw_time,
                d.loteria_type as draw_loteria
            FROM bets b
            JOIN users u ON b.user_id = u.id
            JOIN draws d ON b.draw_id = d.id
            WHERE b.seller_id = $1 ${dateFilter}
            ORDER BY b.created_at DESC
        `, params);
        
        const totals = await pool.query(`
            SELECT 
                COUNT(*) as total_bets,
                COALESCE(SUM(amount), 0) as total_sales,
                COALESCE(SUM(prize_amount), 0) as total_prizes
            FROM bets
            WHERE seller_id = $1 ${dateFilter}
        `, params);
        
        res.json({
            bets: bets.rows,
            totals: totals.rows[0]
        });
    } catch (error) {
        console.error('Error al obtener ventas del vendedor:', error);
        res.status(500).json({ error: 'Error al obtener ventas' });
    }
};