import { Request, Response } from 'express';
import { pool } from '../database/db';

export const processSinpeWebhook = async (req: Request, res: Response) => {
    try {
        console.log('[WEBHOOK] Body recibido:', req.body);
        
        const { phone, amount, reference_number, user_id } = req.body;
        
        if (!amount || !reference_number) {
            return res.status(400).json({ error: 'Faltan amount o reference_number' });
        }
        
        let userId = user_id;
        
        if (!userId && phone) {
            const userRes = await pool.query(
                `SELECT id FROM users WHERE phone_number = $1`,
                [phone]
            );
            if (userRes.rows.length > 0) {
                userId = userRes.rows[0].id;
            }
        }
        
        if (!userId) {
            return res.status(400).json({ error: 'No se pudo identificar el usuario' });
        }
        
        await pool.query(
            `INSERT INTO sinpe_deposits (user_id, amount, reference_number, status, method_type) 
             VALUES ($1, $2, $3, 'PENDING', 'WEBHOOK')`,
            [userId, amount, reference_number]
        );
        
        res.json({ success: true, message: 'Recarga registrada correctamente' });
    } catch (error) {
        console.error('[WEBHOOK] Error:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};