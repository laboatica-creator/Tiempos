import { Request, Response } from 'express';
import { pool } from '../index';
import { AuthRequest } from '../middlewares/auth.middleware';

// ==================== OBTENER VENDEDORES ====================
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

// ==================== ESTADÍSTICAS DE VENDEDORES ====================
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
                total_sales_today: Number(today?.total_sales) || 0,
                total_bets_today: Number(today?.total_bets) || 0,
                total_sales_week: Number(week?.total_sales) || 0,
                total_bets_week: Number(week?.total_bets) || 0,
                total_sales_month: Number(month?.total_sales) || 0,
                total_bets_month: Number(month?.total_bets) || 0
            };
        });
        
        res.json(stats);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};

// ==================== ACTIVAR/DESACTIVAR VENDEDOR ====================
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

// ==================== VENTAS DETALLADAS DE UN VENDEDOR ====================
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

// ==================== LIQUIDAR VENDEDOR ====================
export const liquidateSeller = async (req: AuthRequest, res: Response) => {
    const { seller_id, start_date, end_date, commission_percentage } = req.body;
    const adminId = req.user?.id;
    
    // Validaciones
    if (!seller_id || !start_date || !end_date) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    if (!commission_percentage || commission_percentage < 0 || commission_percentage > 100) {
        return res.status(400).json({ error: 'Porcentaje de comisión inválido (0-100)' });
    }
    
    try {
        // Obtener ventas del período
        const salesResult = await pool.query(`
            SELECT 
                COALESCE(SUM(amount), 0) as total_sales,
                COALESCE(SUM(prize_amount), 0) as total_prizes
            FROM bets
            WHERE seller_id = $1 
            AND DATE(created_at) BETWEEN $2 AND $3
            AND status = 'active'
        `, [seller_id, start_date, end_date]);
        
        const totalSales = parseFloat(salesResult.rows[0].total_sales);
        const totalPrizes = parseFloat(salesResult.rows[0].total_prizes);
        const commissionAmount = totalSales * (commission_percentage / 100);
        
        // Verificar si las ventas cubren los premios
        if (totalPrizes > totalSales) {
            const shortfall = totalPrizes - totalSales;
            return res.status(400).json({ 
                error: `⚠️ ALERTA: Los premios (₡${totalPrizes.toLocaleString()}) superan las ventas (₡${totalSales.toLocaleString()}). El vendedor debe pagar ₡${shortfall.toLocaleString()} adicionales.`,
                shortfall: shortfall,
                total_sales: totalSales,
                total_prizes: totalPrizes,
                commission_percentage: commission_percentage,
                commission_amount: commissionAmount
            });
        }
        
        const netToSeller = totalSales - totalPrizes - commissionAmount;
        
        // Guardar liquidación
        const liquidation = await pool.query(`
            INSERT INTO seller_liquidations (
                seller_id, admin_id, start_date, end_date, 
                total_sales, total_prizes, commission_percentage, 
                commission_amount, net_amount, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
            RETURNING *
        `, [seller_id, adminId, start_date, end_date, totalSales, totalPrizes, 
            commission_percentage, commissionAmount, netToSeller]);
        
        res.json({
            success: true,
            liquidation: liquidation.rows[0],
            summary: {
                total_sales: totalSales,
                total_prizes: totalPrizes,
                commission_percentage: commission_percentage,
                commission_amount: commissionAmount,
                net_to_seller: netToSeller
            }
        });
    } catch (error) {
        console.error('Error al liquidar:', error);
        res.status(500).json({ error: 'Error al liquidar ventas' });
    }
};

// ==================== PAGAR PREMIO DE UNA APUESTA ====================
export const payPrize = async (req: AuthRequest, res: Response) => {
    const { betId } = req.params;
    
    try {
        // Verificar la apuesta
        const betCheck = await pool.query(`
            SELECT id, status, prize_amount, prize_paid
            FROM bets
            WHERE id = $1
        `, [betId]);
        
        if (betCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Apuesta no encontrada' });
        }
        
        const bet = betCheck.rows[0];
        
        if (bet.status !== 'won') {
            return res.status(400).json({ error: 'Esta apuesta no es ganadora' });
        }
        
        if (bet.prize_paid) {
            return res.status(400).json({ error: 'Este premio ya fue pagado' });
        }
        
        // Marcar como pagado
        const result = await pool.query(`
            UPDATE bets 
            SET prize_paid = true, prize_paid_at = NOW()
            WHERE id = $1 AND status = 'won'
            RETURNING *
        `, [betId]);
        
        res.json({ 
            success: true, 
            message: `Premio de ₡${bet.prize_amount.toLocaleString()} pagado correctamente`,
            bet: result.rows[0]
        });
    } catch (error) {
        console.error('Error al pagar premio:', error);
        res.status(500).json({ error: 'Error al pagar premio' });
    }
};

// ==================== OBTENER LIQUIDACIONES DE UN VENDEDOR ====================
export const getSellerLiquidations = async (req: AuthRequest, res: Response) => {
    const { sellerId } = req.params;
    
    try {
        const result = await pool.query(`
            SELECT l.*, a.full_name as admin_name
            FROM seller_liquidations l
            LEFT JOIN users a ON l.admin_id = a.id
            WHERE l.seller_id = $1
            ORDER BY l.created_at DESC
        `, [sellerId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener liquidaciones:', error);
        res.status(500).json({ error: 'Error al obtener liquidaciones' });
    }
};

// ==================== MARCAR LIQUIDACIÓN COMO PAGADA ====================
export const markLiquidationPaid = async (req: AuthRequest, res: Response) => {
    const { liquidationId } = req.params;
    
    try {
        const result = await pool.query(`
            UPDATE seller_liquidations 
            SET status = 'paid', paid_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [liquidationId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Liquidación no encontrada' });
        }
        
        res.json({ 
            success: true, 
            message: 'Liquidación marcada como pagada',
            liquidation: result.rows[0]
        });
    } catch (error) {
        console.error('Error al marcar liquidación:', error);
        res.status(500).json({ error: 'Error al actualizar liquidación' });
    }
};