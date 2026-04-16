import { Request, Response } from 'express';
import { pool } from '../index';
import { AuthRequest } from '../middlewares/auth.middleware';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_tiempos_prod_2026';

// Helper para parsear fechas de forma segura (Fix Error 3)
const getDrawClosingTime = (drawDate: string, drawTime: string) => {
    try {
        const [year, month, day] = drawDate.split('-').map(Number);
        const [hour, minute] = drawTime.split(':').map(Number);
        const drawDateTime = new Date(year, month - 1, day, hour, minute, 0);
        return new Date(drawDateTime.getTime() - 20 * 60 * 1000);
    } catch (e) {
        return new Date(0);
    }
};

export const createCashBet = async (req: AuthRequest, res: Response) => {
    const authHeader = req.headers.authorization;
    let sellerId = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            sellerId = decoded.id;
        } catch (err) {
            return res.status(401).json({ error: 'Sesión expirada' });
        }
    }

    if (!sellerId) return res.status(401).json({ error: 'Vendedor no identificado' });

    const { player_name, player_phone, number, amount, draw_id } = req.body;

    if (!number || !amount || !draw_id) {
        return res.status(400).json({ error: 'Faltan datos de la apuesta' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Validar sorteo y Cierre (Fix Error 3)
        const drawRes = await client.query(
            `SELECT id, draw_date, draw_time, status FROM draws WHERE id = $1 FOR SHARE`, 
            [draw_id]
        );
        
        if (drawRes.rows.length === 0) throw new Error('Sorteo no encontrado');
        const draw = drawRes.rows[0];
        
        const closeTime = getDrawClosingTime(draw.draw_date.toISOString().split('T')[0], draw.draw_time);
        if (new Date() > closeTime) {
            throw new Error('El sorteo ya cerró (20 min antes)');
        }

        // 2. Buscar/Crear usuario de ventanilla
        let userResult = await client.query(`SELECT id FROM users WHERE phone_number = $1`, [player_phone]);
        let userId = userResult.rows[0]?.id;

        if (!userId) {
            const newUser = await client.query(
                `INSERT INTO users (full_name, phone_number, national_id, date_of_birth, role, password_hash) 
                 VALUES ($1, $2, $3, '2000-01-01', 'CUSTOMER', 'NO_PASSWORD') RETURNING id`,
                [player_name || 'Cliente Caja', player_phone || '0000', `CASH-${Date.now()}`]
            );
            userId = newUser.rows[0].id;
        }

        // 3. Insertar Cabecera (Fix Error 1: Usar total_amount)
        const betRes = await client.query(
            `INSERT INTO bets (user_id, draw_id, seller_id, total_amount, payment_method, status) 
             VALUES ($1, $2, $3, $4, 'cash', 'ACTIVE') RETURNING id`,
            [userId, draw_id, sellerId, amount]
        );
        const betId = betRes.rows[0].id;

        // 4. Insertar Detalle (Crucial para el historial)
        await client.query(
            `INSERT INTO bet_items (bet_id, number, amount, status) VALUES ($1, $2, $3, 'PENDING')`,
            [betId, number, amount]
        );

        await client.query('COMMIT');
        res.json({ success: true, bet_id: betId });
    } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
};

// ... (El resto de funciones se mantienen iguales)
export const getActiveDraws = async (req: AuthRequest, res: Response) => {
    const { type, date } = req.query;
    try {
        let query = `
            SELECT d.*, 
                   CASE 
                       WHEN (d.draw_date + d.draw_time) - INTERVAL '20 minutes' <= NOW() THEN false 
                       ELSE true 
                   END as is_open
            FROM draws d
            WHERE 1=1
        `;
        const params: any[] = [];

        if (date) {
            params.push(date);
            query += ` AND d.draw_date = $${params.length}`;
        } else {
            query += ` AND d.draw_date >= CURRENT_DATE`;
        }

        if (type) {
            params.push(type);
            query += ` AND d.lottery_type = $${params.length}`;
        }

        query += ` ORDER BY d.draw_date, d.draw_time`;
        
        const draws = await pool.query(query, params);
        res.json(draws.rows);
    } catch (error) {
        console.error('Error al obtener sorteos:', error);
        res.status(500).json({ error: 'Error al obtener sorteos' });
    }
};

export const getTodaySales = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    try {
        const stats = await pool.query(`
            SELECT COUNT(*) as total_bets, COALESCE(SUM(total_amount), 0) as total_amount
            FROM bets WHERE seller_id = $1 AND DATE(created_at) = CURRENT_DATE
        `, [userId]);
        
        const recent = await pool.query(`
            SELECT b.*, d.draw_time, d.lottery_type 
            FROM bets b JOIN draws d ON b.draw_id = d.id
            WHERE b.seller_id = $1 ORDER BY b.created_at DESC LIMIT 10
        `, [userId]);

        res.json({ summary: stats.rows[0], recent_bets: recent.rows });
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
};

export const getSalesHistory = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { start, end } = req.query;
    try {
        const result = await pool.query(`
            SELECT b.*, d.draw_date, d.draw_time, d.lottery_type
            FROM bets b JOIN draws d ON b.draw_id = d.id
            WHERE b.seller_id = $1 AND DATE(b.created_at) BETWEEN $2 AND $3
            ORDER BY b.created_at DESC
        `, [userId, start, end]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
};

export const getTicketData = async (req: AuthRequest, res: Response) => {
    const { betId } = req.params;
    try {
        const bet = await pool.query(`
            SELECT b.*, bi.number, bi.amount, d.draw_date, d.draw_time, d.lottery_type
            FROM bets b 
            JOIN bet_items bi ON bi.bet_id = b.id
            JOIN draws d ON b.draw_id = d.id
            WHERE b.id = $1
        `, [betId]);
        res.json(bet.rows[0]);
    } catch (error) {
        res.status(404).json({ error: 'No encontrado' });
    }
};