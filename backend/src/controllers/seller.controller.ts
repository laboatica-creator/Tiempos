import { Request, Response } from 'express';
import { pool } from '../index';
import { AuthRequest } from '../middlewares/auth.middleware';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_tiempos_prod_2026';

// ============================================================
// HELPER: Extraer sellerId del token JWT de forma robusta
// Sirve como fallback si req.user no viene correctamente seteado
// ============================================================
const getSellerIdFromRequest = (req: AuthRequest): string | null => {
    // Opción 1: req.user seteado correctamente por el middleware
    if (req.user?.id) {
        console.log('[seller] sellerId from req.user:', req.user.id);
        return req.user.id;
    }

    // Opción 2 (fallback): Decodificar el token manualmente
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            const id = decoded.id || decoded.userId || decoded.sub;
            if (id) {
                console.log('[seller] sellerId from token (fallback):', id);
                return id;
            }
        } catch (err) {
            console.error('[seller] Error decodificando token:', err);
        }
    }

    return null;
};

// Obtener sorteos activos para apostar (Solo hoy y próximos)
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

// ==============================================================
// REGISTRAR APUESTA EN EFECTIVO (Vendedor)
// ==============================================================
export const createCashBet = async (req: AuthRequest, res: Response) => {
    // 🔥 FIX: Obtener sellerId de forma robusta (req.user O del token directamente)
    const sellerId = getSellerIdFromRequest(req);

    if (!sellerId) {
        console.error('[createCashBet] sellerId no encontrado. req.user:', req.user, 'headers:', req.headers.authorization?.substring(0, 40));
        return res.status(401).json({ error: 'Vendedor no autenticado. Token inválido o expirado.' });
    }

    const {
        player_name,
        player_phone,
        items,    // Array: [{number: '05', amount: 500}, ...]
        draw_id
    } = req.body;

    if (!draw_id) {
        return res.status(400).json({ error: 'Falta el sorteo (draw_id)' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Faltan los ítems de la apuesta' });
    }

    // Validar que todos los items tengan número y monto válido
    for (const item of items) {
        if (!item.number || !item.amount || Number(item.amount) < 200) {
            return res.status(400).json({ error: `Ítem inválido: número=${item.number}, monto=${item.amount}. Mínimo ₡200.` });
        }
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Verificar que el sorteo existe y está abierto
        const drawRes = await client.query(`
            SELECT id, lottery_type, draw_date, draw_time,
                   CASE 
                     WHEN (draw_date = CURRENT_DATE AND (draw_time - INTERVAL '20 minutes') < CURRENT_TIME) THEN false
                     WHEN (draw_date < CURRENT_DATE) THEN false
                     ELSE true 
                   END as is_open
            FROM draws WHERE id = $1
        `, [draw_id]);

        if (drawRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Sorteo no encontrado' });
        }
        if (!drawRes.rows[0].is_open) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'El sorteo ya está cerrado para nuevas apuestas' });
        }

        // 2. Buscar o crear el cliente de ventanilla
        const phone = (player_phone || '00000000').toString().trim();
        const name = (player_name || 'Cliente de Ventanilla').toString().trim();

        let userId: string;

        const userCheck = await client.query(
            'SELECT id FROM users WHERE phone_number = $1',
            [phone]
        );

        if (userCheck.rows.length > 0) {
            userId = userCheck.rows[0].id;
            console.log('[createCashBet] Usuario existente encontrado:', userId);
        } else {
            // Crear nuevo usuario de ventanilla
            const newUser = await client.query(`
                INSERT INTO users (full_name, phone_number, national_id, date_of_birth, password_hash, role, is_active)
                VALUES ($1, $2, $3, '2000-01-01', 'CASH_USER_NO_LOGIN', 'CUSTOMER', true)
                RETURNING id
            `, [name, phone, `CASH-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`]);

            userId = newUser.rows[0].id;
            console.log('[createCashBet] Nuevo usuario de ventanilla creado:', userId);
        }

        // 🔥 FIX: Asegurar que el usuario tenga billetera (aunque sea para clientes en caja)
        await client.query(`
            INSERT INTO wallets (user_id, balance) 
            VALUES ($1, 0) 
            ON CONFLICT (user_id) DO NOTHING
        `, [userId]);

        // 3. Calcular total e insertar la apuesta principal
        const totalAmount = items.reduce((sum: number, i: any) => sum + Number(i.amount), 0);

        console.log('[createCashBet] Insertando bet con seller_id:', sellerId, 'total:', totalAmount);

        const betInsert = await client.query(`
            INSERT INTO bets (user_id, draw_id, seller_id, total_amount, payment_method, status)
            VALUES ($1, $2, $3, $4, 'cash', 'ACTIVE')
            RETURNING id
        `, [userId, draw_id, sellerId, totalAmount]);

        const betId = betInsert.rows[0].id;
        console.log('[createCashBet] Bet creado con ID:', betId);

        // 4. Insertar los ítems de la apuesta (números individuales)
        for (const item of items) {
            await client.query(`
                INSERT INTO bet_items (bet_id, number, amount, status)
                VALUES ($1, $2, $3, 'PENDING')
            `, [betId, item.number.toString(), Number(item.amount)]);
        }

        await client.query('COMMIT');
        console.log('[createCashBet] ✅ Transacción completada exitosamente. bet_id:', betId);

        res.status(201).json({
            success: true,
            message: 'Apuesta registrada correctamente',
            bet_id: betId,
            seller_id: sellerId,
            total: totalAmount,
            items_count: items.length
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('[createCashBet] ❌ Error en transacción:', error.message, error.stack);
        res.status(500).json({ error: error.message || 'Error al procesar la apuesta' });
    } finally {
        client.release();
    }
};

// Resumen del día para el vendedor
export const getTodaySales = async (req: AuthRequest, res: Response) => {
    const sellerId = getSellerIdFromRequest(req);
    if (!sellerId) return res.status(401).json({ error: 'No autenticado' });

    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(b.id) as total_tickets,
                COALESCE(SUM(b.total_amount), 0) as total_volume,
                COALESCE(SUM(CASE WHEN d.lottery_type = 'TICA' THEN b.total_amount ELSE 0 END), 0) as tica_total,
                COALESCE(SUM(CASE WHEN d.lottery_type = 'NICA' THEN b.total_amount ELSE 0 END), 0) as nica_total
            FROM bets b
            JOIN draws d ON b.draw_id = d.id
            WHERE b.seller_id = $1 
            AND b.created_at >= date_trunc('day', NOW())
        `, [sellerId]);

        const recent = await pool.query(`
            SELECT b.id, b.total_amount, b.created_at, d.lottery_type, d.draw_time,
                   (SELECT COUNT(*) FROM bet_items WHERE bet_id = b.id) as items_count
            FROM bets b
            JOIN draws d ON b.draw_id = d.id
            WHERE b.seller_id = $1 
            AND b.created_at >= date_trunc('day', NOW())
            ORDER BY b.created_at DESC
            LIMIT 20
        `, [sellerId]);

        res.json({
            summary: stats.rows[0],
            recent_bets: recent.rows
        });
    } catch (error) {
        console.error('Error en getTodaySales:', error);
        res.status(500).json({ error: 'Error al obtener resumen de hoy' });
    }
};

// Historial de ventas con filtros de fecha
export const getSalesHistory = async (req: AuthRequest, res: Response) => {
    const sellerId = getSellerIdFromRequest(req);
    if (!sellerId) return res.status(401).json({ error: 'No autenticado' });

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
        console.error('Error en getSalesHistory:', error);
        res.status(500).json({ error: 'Error al obtener historial' });
    }
};

// Datos del ticket para impresión
export const getTicketData = async (req: AuthRequest, res: Response) => {
    const sellerId = getSellerIdFromRequest(req);
    const { betId } = req.params;

    try {
        const bet = await pool.query(`
            SELECT b.id, b.total_amount, b.created_at, b.seller_id,
                   u.full_name as seller_name,
                   d.lottery_type, d.draw_date, d.draw_time,
                   cu.full_name as player_name
            FROM bets b
            JOIN users u ON b.seller_id = u.id
            JOIN draws d ON b.draw_id = d.id
            LEFT JOIN users cu ON b.user_id = cu.id
            WHERE b.id = $1
        `, [betId]);

        if (bet.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket no encontrado' });
        }

        const items = await pool.query(`
            SELECT number, amount FROM bet_items WHERE bet_id = $1 ORDER BY number
        `, [betId]);

        res.json({
            ...bet.rows[0],
            items: items.rows
        });
    } catch (error) {
        console.error('Error en getTicketData:', error);
        res.status(500).json({ error: 'Error al obtener datos del ticket' });
    }
};