import { Request, Response } from 'express';
import { pool } from '../database/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendTicketPurchaseEmail } from '../services/email.service';

const MAX_BET_PER_NUMBER_PER_USER = 20000;
const MAX_TOTAL_BET_PER_NUMBER_PER_DRAW = 100000;
const PAYOUT_MULTIPLIER = 90;

// Helper para parsear fechas de forma segura (Fix Error 3)
const getDrawClosingTime = (drawDate: any, drawTime: string) => {
    try {
        // drawDate puede venir como objeto Date o string YYYY-MM-DD
        const dateStr = drawDate instanceof Date ? drawDate.toISOString().split('T')[0] : drawDate.toString();
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hour, minute] = drawTime.split(':').map(Number);
        
        // Crear fecha en hora local del servidor (asumimos configura para CR o UTC)
        const drawDateTime = new Date(year, month - 1, day, hour, minute, 0);
        return new Date(drawDateTime.getTime() - 20 * 60 * 1000);
    } catch (e) {
        console.error('[BET] Error calculando cierre:', e);
        return new Date(0);
    }
};

export const placeBet = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { draw_id, bets } = req.body; 

    if (!draw_id || !bets || !Array.isArray(bets) || bets.length === 0) {
        return res.status(400).json({ error: 'Formato de apuesta inválido.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Verificar sorteo y validar horario de cierre (20 minutos antes)
        const drawRes = await client.query(
            `SELECT status, draw_date, draw_time, lottery_type FROM draws WHERE id = $1 FOR SHARE`, 
            [draw_id]
        );
        
        if (drawRes.rows.length === 0) throw new Error('Sorteo no encontrado.');
        const draw = drawRes.rows[0];
        
        // 🔥 FIX Error 3: Cálculo robusto del cierre
        const closeTime = getDrawClosingTime(draw.draw_date, draw.draw_time);
        const now = new Date();
        
        if (now > closeTime) {
            const timeLimit = closeTime.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
            throw new Error(`⏰ Sorteo cerrado. El tiempo límite era las ${timeLimit} (20 min antes).`);
        }
        
        if (draw.status !== 'OPEN') {
            throw new Error('El sorteo no está abierto para apuestas.');
        }

        let totalAmount = 0;
        for (const b of bets) {
            if (b.amount < 100) throw new Error('Monto mínimo ₡100');
            totalAmount += b.amount;
            
            // Riesgo Máximo
            const exposureRes = await client.query(
                `SELECT current_exposure, max_exposure, is_closed FROM draw_exposure WHERE draw_id = $1 AND number = $2 FOR UPDATE`,
                [draw_id, b.number]
            );
            
            if (exposureRes.rows.length > 0) {
                const exp = exposureRes.rows[0];
                if (exp.is_closed || (Number(exp.current_exposure) + b.amount) > Number(exp.max_exposure)) {
                    throw new Error(`El número ${b.number} ya no acepta más apuestas para este sorteo.`);
                }
            }
        }

        // 2. Cobro de Saldo
        const walletRes = await client.query(`SELECT balance, bonus_balance FROM wallets WHERE user_id = $1 FOR UPDATE`, [userId]);
        const wallet = walletRes.rows[0];
        const totalAvailable = Number(wallet.balance) + Number(wallet.bonus_balance);
        
        if (totalAvailable < totalAmount) throw new Error('Saldo insuficiente.');

        const bonusUsed = Math.min(Number(wallet.bonus_balance), totalAmount);
        const balanceUsed = totalAmount - bonusUsed;

        await client.query(
            `UPDATE wallets SET balance = balance - $1, bonus_balance = bonus_balance - $2, total_bets = total_bets + $3 WHERE user_id = $4`,
            [balanceUsed, bonusUsed, totalAmount, userId]
        );

        // 3. Crear Apuesta
        const betTicketRes = await client.query(
            `INSERT INTO bets (user_id, draw_id, total_amount, bonus_amount, status, payment_method) 
             VALUES ($1, $2, $3, $4, 'ACTIVE', 'wallet') RETURNING id`,
            [userId, draw_id, totalAmount, bonusUsed]
        );
        const betId = betTicketRes.rows[0].id;

        for (const b of bets) {
            await client.query(
                `INSERT INTO bet_items (bet_id, number, amount, status) VALUES ($1, $2, $3, 'PENDING')`,
                [betId, b.number, b.amount]
            );
            await client.query(
                `INSERT INTO draw_exposure (draw_id, number, current_exposure) VALUES ($1, $2, $3)
                 ON CONFLICT (draw_id, number) DO UPDATE SET current_exposure = draw_exposure.current_exposure + $3`,
                [draw_id, b.number, b.amount]
            );
        }

        await client.query(
            `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id) 
             VALUES ((SELECT id FROM wallets WHERE user_id = $1), 'BET', $2, $3, $4)`,
            [userId, totalAmount, `Apuesta: ${draw.lottery_type} ${draw.draw_time}`, betId]
        );

        await client.query('COMMIT');
        res.status(201).json({ message: '¡Apuesta exitosa!', bet_id: betId });
    } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
};

export const getUserBets = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { date } = req.query;
        
        // 🔥 FIX Error 2: Filtro de fecha más flexible para evitar problemas de UTC
        let query = `
            SELECT b.*, d.lottery_type, d.draw_date, d.draw_time,
            (SELECT json_agg(bi.*) FROM bet_items bi WHERE bi.bet_id = b.id) as items
            FROM bets b
            JOIN draws d ON b.draw_id = d.id
            WHERE b.user_id = $1
        `;
        const params: any[] = [userId];

        if (date) {
            // Usamos un rango de 24h para la fecha solicitada para capturar apuestas en borde de zona horaria
            query += ` AND b.created_at::date = $2`;
            params.push(date);
        }

        query += ` ORDER BY b.created_at DESC LIMIT 50`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener historial' });
    }
};

export const cancelBet = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { betId } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const betRes = await client.query(
            `SELECT b.*, d.status as draw_status FROM bets b JOIN draws d ON b.draw_id = d.id 
             WHERE b.id = $1 AND b.user_id = $2 FOR UPDATE`,
            [betId, userId]
        );

        if (betRes.rows.length === 0) throw new Error('Apuesta no encontrada.');
        const bet = betRes.rows[0];

        if (bet.status !== 'ACTIVE' || bet.draw_status !== 'OPEN') throw new Error('No anulable.');

        const bonusRefund = Number(bet.bonus_amount || 0);
        const cashRefund = Number(bet.total_amount) - bonusRefund;

        await client.query(
            `UPDATE wallets SET balance = balance + $1, bonus_balance = bonus_balance + $2, total_bets = total_bets - $3 WHERE user_id = $4`,
            [cashRefund, bonusRefund, bet.total_amount, userId]
        );

        await client.query(`UPDATE bets SET status = 'CANCELLED' WHERE id = $1`, [betId]);
        await client.query('COMMIT');
        res.json({ message: 'Apuesta anulada.' });
    } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
};

export const getNumberExposure = async (req: Request, res: Response) => {
    const { draw_id } = req.params;
    try {
        const result = await pool.query(`SELECT number, current_exposure FROM draw_exposure WHERE draw_id = $1`, [draw_id]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error' });
    }
};