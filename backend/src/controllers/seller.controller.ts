import { Request, Response } from 'express';
import { pool } from '../index';
import { AuthRequest } from '../middlewares/auth.middleware';
import jwt from 'jsonwebtoken';

// Obtener sorteos activos para apostar
export const getActiveDraws = async (req: AuthRequest, res: Response) => {
    try {
        const draws = await pool.query(`
            SELECT d.*, 
                   CASE WHEN NOW() > d.draw_time - INTERVAL '20 minutes' THEN false ELSE true END as is_open
            FROM draws d
            WHERE d.draw_date >= CURRENT_DATE
            ORDER BY d.draw_date, d.draw_time
        `);
        res.json(draws.rows);
    } catch (error) {
        console.error('Error al obtener sorteos:', error);
        res.status(500).json({ error: 'Error al obtener sorteos' });
    }
};

// Registrar apuesta en efectivo (vendedor)
export const createCashBet = async (req: AuthRequest, res: Response) => {
    // 🔥 Obtener seller_id del token manualmente
    const authHeader = req.headers.authorization;
    let sellerId = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey_tiempos_prod_2026') as any;
            sellerId = decoded.id;
            console.log('sellerId desde token:', sellerId);
        } catch (err) {
            console.error('Error decodificando token:', err);
        }
    }
    
    const { player_name, player_phone, number, amount, draw_id, loteria_type } = req.body;
    
    if (!sellerId) {
        return res.status(401).json({ error: 'Vendedor no autenticado - token inválido' });
    }
    
    if (!player_name || !player_phone || !number || !amount || !draw_id) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    if (amount < 200) {
        return res.status(400).json({ error: 'El monto mínimo es ₡200' });
    }
    
    try {
        // Verificar si el sorteo está abierto
        const drawCheck = await pool.query(`
            SELECT id, draw_time, 
                   CASE WHEN NOW() > draw_time - INTERVAL '20 minutes' THEN false ELSE true END as is_open
            FROM draws WHERE id = $1
        `, [draw_id]);
        
        if (drawCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Sorteo no encontrado' });
        }
        
        if (!drawCheck.rows[0].is_open) {
            return res.status(400).json({ error: 'El sorteo ya cerró para apuestas' });
        }
        
        // Buscar o crear cliente
        let userResult = await pool.query(
            `SELECT id FROM users WHERE phone_number = $1 AND role = 'CUSTOMER'`,
            [player_phone]
        );
        
        let userId;
        if (userResult.rows.length === 0) {
            const newUser = await pool.query(
                `INSERT INTO users (full_name, phone_number, email, role, is_active) 
                 VALUES ($1, $2, $3, 'CUSTOMER', true) RETURNING id`,
                [player_name, player_phone, `temp_${player_phone}@tiempos.com`]
            );
            userId = newUser.rows[0].id;
        } else {
            userId = userResult.rows[0].id;
        }
        
        // Registrar apuesta con seller_id
        const bet = await pool.query(
            `INSERT INTO bets (user_id, seller_id, draw_id, number, amount, status, payment_method, loteria_type, created_at)
             VALUES ($1, $2, $3, $4, $5, 'active', 'cash', $6, NOW())
             RETURNING *`,
            [userId, sellerId, draw_id, number, amount, loteria_type || 'TICA']
        );
        
        console.log('Apuesta registrada - ID:', bet.rows[0].id, 'seller_id:', sellerId);
        
        res.json({
            success: true,
            bet: bet.rows[0],
            ticket_id: bet.rows[0].id,
            message: 'Apuesta registrada exitosamente'
        });
    } catch (error) {
        console.error('Error al registrar apuesta:', error);
        res.status(500).json({ error: 'Error al registrar la apuesta' });
    }
};

// Obtener ventas del día del vendedor
export const getTodaySales = async (req: AuthRequest, res: Response) => {
    const sellerId = req.user?.id;
    
    if (!sellerId) {
        return res.status(401).json({ error: 'Vendedor no autenticado' });
    }
    
    try {
        const sales = await pool.query(`
            SELECT COUNT(*) as total_bets,
                   COALESCE(SUM(amount), 0) as total_amount,
                   COUNT(CASE WHEN loteria_type = 'TICA' THEN 1 END) as tica_bets,
                   COUNT(CASE WHEN loteria_type = 'NICA' THEN 1 END) as nica_bets
            FROM bets
            WHERE seller_id = $1 
            AND DATE(created_at) = CURRENT_DATE
            AND status = 'active'
        `, [sellerId]);
        
        const recentBets = await pool.query(`
            SELECT b.*, u.full_name as player_name, d.draw_time, d.draw_date
            FROM bets b
            JOIN users u ON b.user_id = u.id
            JOIN draws d ON b.draw_id = d.id
            WHERE b.seller_id = $1 
            AND DATE(b.created_at) = CURRENT_DATE
            ORDER BY b.created_at DESC
            LIMIT 20
        `, [sellerId]);
        
        res.json({
            summary: sales.rows[0],
            recent_bets: recentBets.rows
        });
    } catch (error) {
        console.error('Error al obtener ventas:', error);
        res.status(500).json({ error: 'Error al obtener ventas' });
    }
};

// Obtener historial de ventas
export const getSalesHistory = async (req: AuthRequest, res: Response) => {
    const sellerId = req.user?.id;
    const { start_date, end_date } = req.query;
    
    if (!sellerId) {
        return res.status(401).json({ error: 'Vendedor no autenticado' });
    }
    
    try {
        let query = `
            SELECT b.*, u.full_name as player_name, d.draw_time, d.draw_date
            FROM bets b
            JOIN users u ON b.user_id = u.id
            JOIN draws d ON b.draw_id = d.id
            WHERE b.seller_id = $1
        `;
        const params: any[] = [sellerId];
        
        if (start_date && end_date) {
            query += ` AND DATE(b.created_at) BETWEEN $2 AND $3`;
            params.push(start_date, end_date);
        }
        
        query += ` ORDER BY b.created_at DESC`;
        
        const bets = await pool.query(query, params);
        
        const totals = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) as total_sales,
                   COUNT(*) as total_bets
            FROM bets
            WHERE seller_id = $1
            ${start_date && end_date ? 'AND DATE(created_at) BETWEEN $2 AND $3' : ''}
        `, params);
        
        res.json({
            bets: bets.rows,
            total_sales: totals.rows[0].total_sales,
            total_bets: totals.rows[0].total_bets
        });
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ error: 'Error al obtener historial' });
    }
};

// Imprimir comprobante
export const getTicketData = async (req: AuthRequest, res: Response) => {
    const { betId } = req.params;
    const sellerId = req.user?.id;
    
    try {
        const ticket = await pool.query(`
            SELECT b.*, u.full_name as player_name, u.phone_number as player_phone,
                   d.draw_time, d.draw_date, d.lottery_type as draw_loteria
            FROM bets b
            JOIN users u ON b.user_id = u.id
            JOIN draws d ON b.draw_id = d.id
            WHERE b.id = $1 AND b.seller_id = $2
        `, [betId, sellerId]);
        
        if (ticket.rows.length === 0) {
            return res.status(404).json({ error: 'Comprobante no encontrado' });
        }
        
        res.json(ticket.rows[0]);
    } catch (error) {
        console.error('Error al obtener ticket:', error);
        res.status(500).json({ error: 'Error al obtener comprobante' });
    }
};