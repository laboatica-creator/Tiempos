import { Request, Response } from 'express';
import { pool } from '../index';
import { AuthRequest } from '../middlewares/auth.middleware';

// Obtener sorteos activos para apostar (Solo hoy y próximos dias)
export const getActiveDraws = async (req: AuthRequest, res: Response) => {
    try {
        const draws = await pool.query(`
            SELECT d.*, 
                   CASE 
                     WHEN (draw_date = CURRENT_DATE AND (draw_time - INTERVAL '20 minutes') < CURRENT_TIME) THEN false
                     WHEN (draw_date < CURRENT_DATE) THEN false
                     ELSE true 
                   END as is_open
            FROM draws d
            WHERE d.draw_date >= CURRENT_DATE AND d.status = 'OPEN'
            ORDER BY d.draw_date, d.draw_time
        `);
        res.json(draws.rows);
    } catch (error) {
        console.error('Error al obtener sorteos:', error);
        res.status(500).json({ error: 'Error al obtener sorteos' });
    }
};

// Registrar apuesta en efectivo (Vendedor)
export const createCashBet = async (req: AuthRequest, res: Response) => {
    const sellerId = req.user?.id;
    const { 
        player_name, 
        player_phone, 
        items, // Esperamos un array: [{number: '05', amount: 500}, ...]
        draw_id 
    } = req.body;
    
    if (!sellerId) return res.status(401).json({ error: 'Vendedor no identificado' });
    if (!draw_id || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Faltan datos de la apuesta (sorteo o números)' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Verificar sorteo
        const drawRes = await client.query(`
            SELECT id, lottery_type, draw_date, draw_time,
                   CASE 
                     WHEN (draw_date = CURRENT_DATE AND (draw_time - INTERVAL '20 minutes') < CURRENT_TIME) THEN false
                     WHEN (draw_date < CURRENT_DATE) THEN false
                     ELSE true 
                   END as is_open
            FROM draws WHERE id = $1
        `, [draw_id]);

        if (drawRes.rows.length === 0) throw new Error('Sorteo no encontrado');
        if (!drawRes.rows[0].is_open) throw new Error('El sorteo ya está cerrado');

        const draw = drawRes.rows[0];

        // 2. Buscar o crear cliente temporal (Jugador)
        let userId;
        const phone = player_phone || '00000000';
        const name = player_name || 'Cliente de Ventanilla';

        const userCheck = await client.query('SELECT id FROM users WHERE phone_number = $1', [phone]);
        if (userCheck.rows.length > 0) {
            userId = userCheck.rows[0].id;
        } else {
            const newUser = await client.query(`
                INSERT INTO users (full_name, phone_number, national_id, date_of_birth, password_hash, role, is_active)
                VALUES ($1, $2, $3, '2000-01-01', 'CASH_USER', 'CUSTOMER', true)
                RETURNING id
            `, [name, phone, `CASH-${Date.now()}`]);
            userId = newUser.rows[0].id;
            
            // Crear billetera vacía
            await client.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0)', [userId]);
        }

        // 3. Calcular total e insertar Bet
        const totalAmount = items.reduce((sum, i) => sum + Number(i.amount), 0);
        
        const betInsert = await client.query(`
            INSERT INTO bets (user_id, draw_id, seller_id, total_amount, payment_method, status)
            VALUES ($1, $2, $3, $4, 'cash', 'ACTIVE')
            RETURNING id
        `, [userId, draw_id, sellerId, totalAmount]);
        
        const betId = betInsert.rows[0].id;

        // 4. Insertar Bet Items
        for (const item of items) {
            await client.query(`
                INSERT INTO bet_items (bet_id, number, amount, status)
                VALUES ($1, $2, $3, 'PENDING')
            `, [betId, item.number, item.amount]);
        }

        await client.query('COMMIT');
        
        res.status(201).json({
            success: true,
            message: 'Apuesta registrada correctamente',
            bet_id: betId
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error en createCashBet:', error);
        res.status(500).json({ error: error.message || 'Error al procesar la apuesta' });
    } finally {
        client.release();
    }
};

// Resumen del día para el vendedor
export const getTodaySales = async (req: AuthRequest, res: Response) => {
    const sellerId = req.user?.id;
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(b.id) as total_tickets,
                COALESCE(SUM(b.total_amount), 0) as total_volume,
                COALESCE(SUM(CASE WHEN d.lottery_type = 'TICA' THEN b.total_amount ELSE 0 END), 0) as tica_total,
                COALESCE(SUM(CASE WHEN d.lottery_type = 'NICA' THEN b.total_amount ELSE 0 END), 0) as nica_total
            FROM bets b
            JOIN draws d ON b.draw_id = d.id
            WHERE b.seller_id = $1 AND b.created_at::date = CURRENT_DATE
        `, [sellerId]);

        const recent = await pool.query(`
            SELECT b.id, b.total_amount, b.created_at, d.lottery_type, d.draw_time
            FROM bets b
            JOIN draws d ON b.draw_id = d.id
            WHERE b.seller_id = $1 AND b.created_at::date = CURRENT_DATE
            ORDER BY b.created_at DESC
            LIMIT 20
        `, [sellerId]);

        res.json({
            summary: stats.rows[0],
            recent_bets: recent.rows
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener resumen de hoy' });
    }
};

// Historial de ventas con filtros
export const getSalesHistory = async (req: AuthRequest, res: Response) => {
    const sellerId = req.user?.id;
    const { start, end } = req.query;
    try {
        const history = await pool.query(`
            SELECT b.id, b.total_amount, b.created_at, d.lottery_type, d.draw_date, d.draw_time,
                   (SELECT COUNT(*) FROM bet_items WHERE bet_id = b.id) as items_count
            FROM bets b
            JOIN draws d ON b.draw_id = d.id
            WHERE b.seller_id = $1
            AND b.created_at::date BETWEEN $2 AND $3
            ORDER BY b.created_at DESC
        `, [sellerId, start || '1900-01-01', end || '2100-12-31']);

        res.json(history.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener historial' });
    }
};

// Datos para el ticket de impresión
export const getTicketData = async (req: AuthRequest, res: Response) => {
    const { betId } = req.params;
    try {
        const bet = await pool.query(`
            SELECT b.id, b.total_amount, b.created_at, u.full_name as seller_name,
                   d.lottery_type, d.draw_date, d.draw_time
            FROM bets b
            JOIN users u ON b.seller_id = u.id
            JOIN draws d ON b.draw_id = d.id
            WHERE b.id = $1
        `, [betId]);

        if (bet.rows.length === 0) return res.status(404).json({ error: 'Ticket no encontrado' });

        const items = await pool.query(`
            SELECT number, amount FROM bet_items WHERE bet_id = $1
        `, [betId]);

        res.json({
            ...bet.rows[0],
            items: items.rows
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener datos del ticket' });
    }
};