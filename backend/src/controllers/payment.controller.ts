import { Request, Response } from 'express';
import { pool } from '../database/db';
import { AuthRequest } from '../middlewares/auth.middleware';

/**
 * Obtener métodos de pago (Público)
 * Corregido para mapear campos bank_name -> name y phone_number -> sinpePhone
 */
export const getPaymentMethods = async (req: Request, res: Response) => {
    try {
        const methods = await pool.query(`
            SELECT 
                id, 
                bank_name as "name", 
                phone_number as "sinpePhone", 
                account_number as "account", 
                type, 
                is_active 
            FROM payment_methods 
            WHERE is_active = true 
            ORDER BY bank_name ASC
        `);
        res.json(methods.rows);
    } catch (error) {
        console.error('Error getting payment methods:', error);
        res.status(500).json({ error: 'Error al obtener métodos de pago' });
    }
};

/**
 * Agregar método de pago (Admin)
 */
export const addPaymentMethod = async (req: AuthRequest, res: Response) => {
    try {
        const { bank_name, phone_number, account_number, type } = req.body;
        const result = await pool.query(`
            INSERT INTO payment_methods (bank_name, phone_number, account_number, type) 
            VALUES ($1, $2, $3, $4) RETURNING *
        `, [bank_name, phone_number, account_number, type]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding payment method', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

/**
 * Desactivar método de pago (Admin)
 */
export const removePaymentMethod = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await pool.query(`UPDATE payment_methods SET is_active = false WHERE id = $1`, [id]);
        res.json({ message: 'Método de pago desactivado' });
    } catch (error) {
        console.error('Error removing payment method', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

/**
 * Obtener tarjetas del usuario
 */
export const getCards = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const result = await pool.query(`SELECT * FROM cards WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error getting cards', error);
        res.status(500).json({ error: 'Error al obtener tarjetas' });
    }
};

/**
 * Agregar tarjeta
 */
export const addCard = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { card_number, expiry_month, expiry_year, holder_name, card_type } = req.body;
        
        const masked = card_number.slice(-4);

        const result = await pool.query(`
            INSERT INTO cards (user_id, card_number_masked, card_type, expiry_month, expiry_year, holder_name) 
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, card_number_masked, card_type, is_default
        `, [userId, masked, card_type, expiry_month, expiry_year, holder_name]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding card', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Eliminar tarjeta
 */
export const deleteCard = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        await pool.query(`DELETE FROM cards WHERE id = $1 AND user_id = $2`, [id, userId]);
        res.json({ message: 'Tarjeta eliminada' });
    } catch (error) {
        console.error('Error deleting card', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
