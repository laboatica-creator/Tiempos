import { Request, Response } from 'express';
import { pool } from '../index';
import { AuthRequest } from '../middlewares/auth.middleware';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_tiempos_prod_2026';

// Obtener seller_id del token
const getSellerIdFromToken = (req: AuthRequest): string | null => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            return decoded.id;
        } catch (err) {
            console.error('Error decodificando token:', err);
            return null;
        }
    }
    return null;
};

// Obtener sorteos activos - CORREGIDO VERSIÓN FINAL
export const getActiveDraws = async (req: AuthRequest, res: Response) => {
    try {
        const { type, date } = req.query;
        
        // Obtener fecha actual en Costa Rica (YYYY-MM-DD)
        const costaRicaNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Costa_Rica' }));
        const todayCostaRica = costaRicaNow.toISOString().split('T')[0];
        
        console.log('📅 getActiveDraws - type:', type, 'date:', date);
        console.log('📅 Hoy Costa Rica:', todayCostaRica);
        console.log('📅 Hora actual Costa Rica:', costaRicaNow.toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' }));
        
        // CORRECCIÓN: Construir timestamp correctamente con timezone
        let query = `
            SELECT 
                d.id,
                d.lottery_type,
                TO_CHAR(d.draw_date, 'YYYY-MM-DD') as draw_date,
                d.draw_time,
                -- Calcular si está abierto (true = se puede apostar)
                -- Está abierto si: ahora + 20 minutos < hora del sorteo
                CASE 
                    WHEN (NOW() AT TIME ZONE 'America/Costa_Rica' + INTERVAL '20 minutes') < 
                         (d.draw_date + d.draw_time) AT TIME ZONE 'America/Costa_Rica'
                    THEN true 
                    ELSE false 
                END as is_open,
                -- Calcular hora de cierre (20 minutos antes)
                TO_CHAR(
                    (d.draw_date + d.draw_time) AT TIME ZONE 'America/Costa_Rica' - INTERVAL '20 minutes',
                    'HH24:MI:SS'
                ) as closing_time
            FROM draws d
            WHERE d.draw_date >= $1::DATE
        `;
        
        const params: any[] = [todayCostaRica];
        
        if (type) {
            query += ` AND d.lottery_type = $${params.length + 1}`;
            params.push(type);
        }
        
        if (date) {
            query += ` AND d.draw_date = $${params.length + 1}::DATE`;
            params.push(date);
        }
        
        query += ` ORDER BY d.draw_date, d.draw_time`;
        
        const result = await pool.query(query, params);
        
        console.log(`✅ Sorteos encontrados: ${result.rows.length}`);
        result.rows.forEach(row => {
            console.log(`   - ${row.draw_date} ${row.draw_time}: is_open=${row.is_open}`);
        });
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching draws:', error);
        res.status(500).json({ error: 'Error fetching draws' });
    }
};

// Registrar apuesta en efectivo (vendedor)
export const createCashBet = async (req: AuthRequest, res: Response) => {
    const sellerId = getSellerIdFromToken(req);
    const { items, draw_id, loteria_type, total_amount } = req.body;
    
    console.log('========== CREATE CASH BET ==========');
    console.log('sellerId:', sellerId);
    console.log('draw_id:', draw_id);
    console.log('loteria_type:', loteria_type);
    console.log('total_amount:', total_amount);
    console.log('items:', JSON.stringify(items, null, 2));
    
    if (!sellerId) {
        return res.status(401).json({ error: 'Vendedor no autenticado' });
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'No hay números seleccionados' });
    }
    
    if (!draw_id) {
        return res.status(400).json({ error: 'Sorteo no seleccionado' });
    }
    
    try {
        // Verificar si el sorteo está abierto (CORREGIDO)
        const drawCheck = await pool.query(`
            SELECT 
                id,
                CASE 
                    WHEN (NOW() AT TIME ZONE 'America/Costa_Rica' + INTERVAL '20 minutes') < 
                         (draw_date + draw_time) AT TIME ZONE 'America/Costa_Rica'
                    THEN true 
                    ELSE false 
                END as is_open
            FROM draws WHERE id = $1
        `, [draw_id]);
        
        if (drawCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Sorteo no encontrado' });
        }
        
        if (!drawCheck.rows[0].is_open) {
            return res.status(400).json({ error: 'El sorteo ya cerró para apuestas (20 min antes)' });
        }
        
        // Crear usuario genérico para ventas en efectivo
        let userId = null;
        const genericUser = await pool.query(
            `SELECT id FROM users WHERE email = 'cash_seller@tiempos.com' LIMIT 1`
        );
        
        if (genericUser.rows.length === 0) {
            const newUser = await pool.query(
                `INSERT INTO users (full_name, email, phone_number, role, is_active) 
                 VALUES ($1, $2, $3, 'CUSTOMER', true) RETURNING id`,
                ['Venta en Efectivo', 'cash_seller@tiempos.com', '00000000']
            );
            userId = newUser.rows[0].id;
        } else {
            userId = genericUser.rows[0].id;
        }
        
        // Insertar cabecera de la apuesta
        const betResult = await pool.query(
            `INSERT INTO bets (user_id, seller_id, draw_id, total_amount, payment_method, loteria_type, status, created_at)
             VALUES ($1, $2, $3, $4, 'cash', $5, 'active', NOW() AT TIME ZONE 'America/Costa_Rica')
             RETURNING id`,
            [userId, sellerId, draw_id, total_amount, loteria_type]
        );
        
        const betId = betResult.rows[0].id;
        
        // Insertar cada ítem (número) en bet_items
        for (const item of items) {
            await pool.query(
                `INSERT INTO bet_items (bet_id, number, amount, status, created_at)
                 VALUES ($1, $2, $3, 'active', NOW() AT TIME ZONE 'America/Costa_Rica')`,
                [betId, item.number, item.amount]
            );
        }
        
        console.log(`✅ Apuesta registrada - ID: ${betId}, seller_id: ${sellerId}, total: ${total_amount}, items: ${items.length}`);
        
        res.json({
            success: true,
            bet_id: betId,
            items: items,
            total_amount: total_amount,
            message: 'Apuesta registrada exitosamente'
        });
        
    } catch (error) {
        console.error('❌ Error en createCashBet:', error);
        res.status(500).json({ error: 'Error al registrar la apuesta' });
    }
};

// Obtener ventas del día del vendedor
export const getTodaySales = async (req: AuthRequest, res: Response) => {
    const sellerId = getSellerIdFromToken(req);
    
    if (!sellerId) {
        return res.status(401).json({ error: 'Vendedor no autenticado' });
    }
    
    try {
        const sales = await pool.query(`
            SELECT 
                COUNT(*) as total_bets,
                COALESCE(SUM(total_amount), 0) as total_amount,
                COUNT(CASE WHEN loteria_type = 'TICA' THEN 1 END) as tica_bets,
                COUNT(CASE WHEN loteria_type = 'NICA' THEN 1 END) as nica_bets
            FROM bets
            WHERE seller_id = $1 
            AND DATE(created_at AT TIME ZONE 'America/Costa_Rica') = CURRENT_DATE
            AND status = 'active'
        `, [sellerId]);
        
        const recentBets = await pool.query(`
            SELECT b.id, b.total_amount, b.loteria_type, b.created_at,
                   array_agg(bi.number) as numbers
            FROM bets b
            JOIN bet_items bi ON b.id = bi.bet_id
            WHERE b.seller_id = $1 
            AND DATE(b.created_at AT TIME ZONE 'America/Costa_Rica') = CURRENT_DATE
            GROUP BY b.id
            ORDER BY b.created_at DESC
            LIMIT 20
        `, [sellerId]);
        
        res.json({
            summary: sales.rows[0],
            recent_bets: recentBets.rows
        });
    } catch (error) {
        console.error('Error fetching today sales:', error);
        res.status(500).json({ error: 'Error fetching sales' });
    }
};

// Obtener historial de ventas
export const getSalesHistory = async (req: AuthRequest, res: Response) => {
    const sellerId = getSellerIdFromToken(req);
    const { start_date, end_date } = req.query;
    
    if (!sellerId) {
        return res.status(401).json({ error: 'Vendedor no autenticado' });
    }
    
    try {
        let query = `
            SELECT b.*, array_agg(bi.number) as numbers
            FROM bets b
            JOIN bet_items bi ON b.id = bi.bet_id
            WHERE b.seller_id = $1
        `;
        const params: any[] = [sellerId];
        
        if (start_date && end_date) {
            query += ` AND DATE(b.created_at AT TIME ZONE 'America/Costa_Rica') BETWEEN $2 AND $3`;
            params.push(start_date, end_date);
        }
        
        query += ` GROUP BY b.id ORDER BY b.created_at DESC`;
        
        const result = await pool.query(query, params);
        
        const totals = await pool.query(`
            SELECT COALESCE(SUM(total_amount), 0) as total_sales,
                   COUNT(*) as total_bets
            FROM bets
            WHERE seller_id = $1
            ${start_date && end_date ? 'AND DATE(created_at AT TIME ZONE \'America/Costa_Rica\') BETWEEN $2 AND $3' : ''}
        `, params);
        
        res.json({
            bets: result.rows,
            total_sales: totals.rows[0].total_sales,
            total_bets: totals.rows[0].total_bets
        });
    } catch (error) {
        console.error('Error fetching sales history:', error);
        res.status(500).json({ error: 'Error fetching history' });
    }
};

// Obtener datos del ticket
export const getTicketData = async (req: AuthRequest, res: Response) => {
    const { betId } = req.params;
    const sellerId = getSellerIdFromToken(req);
    
    try {
        const result = await pool.query(`
            SELECT b.*, array_agg(bi.number) as numbers, array_agg(bi.amount) as amounts
            FROM bets b
            JOIN bet_items bi ON b.id = bi.bet_id
            WHERE b.id = $1 AND b.seller_id = $2
            GROUP BY b.id
        `, [betId, sellerId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({ error: 'Error fetching ticket' });
    }
};