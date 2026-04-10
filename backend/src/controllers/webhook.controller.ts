import { Request, Response } from 'express';
import { pool } from '../database/db';

export const processSinpeWebhook = async (req: Request, res: Response) => {
    try {
        console.log('[WEBHOOK] Body recibido:', req.body);
        
        const { phone, amount, reference_number, user_id } = req.body;
        
        // Validación básica
        if (!amount || !reference_number) {
            return res.status(400).json({ error: 'Faltan amount o reference_number' });
        }
        
        let userId = user_id;
        
        // Buscar usuario por teléfono si no se proporcionó user_id
        if (!userId && phone) {
            const userRes = await pool.query(
                `SELECT id FROM users WHERE phone_number = $1`,
                [phone]
            );
            if (userRes.rows.length > 0) {
                userId = userRes.rows[0].id;
                console.log('[WEBHOOK] Usuario encontrado:', userId);
            }
        }
        
        if (!userId) {
            return res.status(400).json({ error: 'No se pudo identificar el usuario' });
        }
        
        // Insertar la recarga
        await pool.query(
            `INSERT INTO sinpe_deposits (user_id, amount, reference_number, status, method_type) 
             VALUES ($1, $2, $3, 'PENDING', 'WEBHOOK')`,
            [userId, amount, reference_number]
        );
        
        console.log('[WEBHOOK] Recarga registrada correctamente');
        res.json({ success: true, message: 'Recarga registrada correctamente' });
    } catch (error) {
        console.error('[WEBHOOK] Error:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};