import { Request, Response } from 'express';
import { pool } from '../index';
import { AuthRequest } from '../middlewares/auth.middleware';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_tiempos_prod_2026';

// 🔥 Helper unificado para cierre de 20 min (Fix ERROR 2)
const isDrawOpen = (drawDate: any, drawTime: string): boolean => {
    try {
        const dateStr = drawDate instanceof Date ? drawDate.toISOString().split('T')[0] : drawDate.toString().split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hour, minute] = drawTime.split(':').map(Number);
        
        const drawDateTime = new Date(year, month - 1, day, hour, minute, 0);
        const closeTime = new Date(drawDateTime.getTime() - 20 * 60 * 1000);
        const now = new Date();
        
        return now <= closeTime;
    } catch (e) {
        console.error('[BET] Error en isDrawOpen:', e);
        return false;
    }
};

export const createCashBet = async (req: AuthRequest, res: Response) => {
    console.log('🚀 [CASH_BET] Iniciando registro de apuesta...');
    console.log('📦 Body recibido:', JSON.stringify(req.body, null, 2));

    const authHeader = req.headers.authorization;
    let sellerId = null;
    
    if (authHeader?.startsWith('Bearer ')) {
        try {
            const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as any;
            sellerId = decoded.id;
        } catch (err) {
            console.error('❌ Token inválido');
        }
    }

    if (!sellerId) return res.status(401).json({ error: 'Sesión expirada o inválida' });

    // 🔥 FIX ERROR 1: Aceptar 'items' (Carrito) o campos individuales como fallback
    const { player_name, player_phone, draw_id, items, number, amount } = req.body;
    
    // Normalizar jugadas
    const finalItems = items && Array.isArray(items) ? items : (number && amount ? [{ number, amount }] : []);

    if (!draw_id || finalItems.length === 0) {
        console.error('❌ Falta información crítica:', { draw_id, itemsCount: finalItems.length });
        return res.status(400).json({ error: 'Faltan datos de la apuesta (números o sorteo).' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Validar Sorteo y Cierre (Fix ERROR 2)
        const drawRes = await client.query(`SELECT * FROM draws WHERE id = $1`, [draw_id]);
        if (drawRes.rows.length === 0) throw new Error('Sorteo no encontrado');
        const draw = drawRes.rows[0];

        if (!isDrawOpen(draw.draw_date, draw.draw_time)) {
            throw new Error('Lo sentimos, este sorteo ya cerró (límite 20 min antes).');
        }

        // 2. Cliente genérico
        let userResult = await client.query(`SELECT id FROM users WHERE phone_number = $1`, [player_phone || '00000000']);
        let userId = userResult.rows[0]?.id;
        if (!userId) {
            const newUser = await client.query(
                `INSERT INTO users (full_name, phone_number, national_id, date_of_birth, role, password_hash) 
                 VALUES ($1, $2, $3, '2000-01-01', 'CUSTOMER', 'CASH_USER') RETURNING id`,
                [player_name || 'Jugador Efectivo', player_phone || '00000000', `CASH-${Date.now()}`]
            );
            userId = newUser.rows[0].id;
        }

        // 3. Registrar Venta (Cabecera)
        const totalAmount = finalItems.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
        const betRes = await client.query(
            `INSERT INTO bets (user_id, draw_id, seller_id, total_amount, payment_method, status) 
             VALUES ($1, $2, $3, $4, 'cash', 'ACTIVE') RETURNING id`,
            [userId, draw_id, sellerId, totalAmount]
        );
        const betId = betRes.rows[0].id;

        // 4. Registrar Ítems (Fix ERROR 1 y ERROR 4)
        for (const item of finalItems) {
            await client.query(
                `INSERT INTO bet_items (bet_id, number, amount, status) VALUES ($1, $2, $3, 'PENDING')`,
                [betId, item.number, item.amount]
            );
            // Actualizar exposición
            await client.query(
                `INSERT INTO draw_exposure (draw_id, number, current_exposure) VALUES ($1, $2, $3)
                 ON CONFLICT (draw_id, number) DO UPDATE SET current_exposure = draw_exposure.current_exposure + $3`,
                [draw_id, item.number, item.amount]
            );
        }

        await client.query('COMMIT');
        console.log('✅ Apuesta registrada exitosamente:', betId);
        res.json({ success: true, bet_id: betId });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('❌ Error en createCashBet:', error.message);
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
};

export const getActiveDraws = async (req: Request, res: Response) => {
    const { type, date } = req.query;
    try {
        let query = `SELECT * FROM draws WHERE 1=1 `;
        const params: any[] = [];

        if (date) {
            params.push(date);
            query += ` AND draw_date = $${params.length}`;
        } else {
            query += ` AND draw_date >= CURRENT_DATE`;
        }

        if (type) {
            params.push(type);
            query += ` AND lottery_type = $${params.length}`;
        }

        query += ` ORDER BY draw_date, draw_time`;
        const result = await pool.query(query, params);
        
        // 🔥 Calcular is_open en tiempo real para el frontend (ERROR 2)
        const draws = result.rows.map(d => ({
            ...d,
            is_open: isDrawOpen(d.draw_date, d.draw_time)
        }));

        res.json(draws);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener sorteos' });
    }
};

export const getTodaySales = async (req: AuthRequest, res: Response) => {
    const sellerId = req.user?.id;
    try {
        const summary = await pool.query(`
            SELECT COUNT(*) as total_tickets, COALESCE(SUM(total_amount), 0) as total_volume,
            COALESCE(SUM(CASE WHEN d.lottery_type = 'TICA' THEN b.total_amount ELSE 0 END), 0) as tica_total,
            COALESCE(SUM(CASE WHEN d.lottery_type = 'NICA' THEN b.total_amount ELSE 0 END), 0) as nica_total
            FROM bets b
            JOIN draws d ON b.draw_id = d.id
            WHERE b.seller_id = $1 AND DATE(b.created_at) = CURRENT_DATE
        `, [sellerId]);

        res.json({ summary: summary.rows[0], recent_bets: [] });
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
};

export const getSalesHistory = async (req: AuthRequest, res: Response) => {
    const sellerId = req.user?.id;
    const { start, end } = req.query;
    try {
        const query = `
            SELECT b.*, d.draw_date, d.draw_time, d.lottery_type
            FROM bets b JOIN draws d ON b.draw_id = d.id
            WHERE b.seller_id = $1 AND DATE(b.created_at) BETWEEN $2 AND $3
            ORDER BY b.created_at DESC
        `;
        const result = await pool.query(query, [sellerId, start, end]);
        
        const totals = await pool.query(`
            SELECT COALESCE(SUM(total_amount), 0) as total_sales, COUNT(*) as total_bets
            FROM bets WHERE seller_id = $1 AND DATE(created_at) BETWEEN $2 AND $3
        `, [sellerId, start, end]);

        res.json({ bets: result.rows, total_sales: totals.rows[0].total_sales, total_bets: totals.rows[0].total_bets });
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
};

export const getTicketData = async (req: AuthRequest, res: Response) => {
    const { betId } = req.params;
    try {
        const bet = await pool.query(`
            SELECT b.*, d.draw_date, d.draw_time, d.lottery_type,
            (SELECT json_agg(bi.*) FROM bet_items bi WHERE bi.bet_id = b.id) as items
            FROM bets b JOIN draws d ON b.draw_id = d.id
            WHERE b.id = $1
        `, [betId]);
        res.json(bet.rows[0]);
    } catch (error) {
        res.status(404).json({ error: 'No encontrado' });
    }
};