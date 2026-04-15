import { Request, Response } from 'express';
import { pool } from '../index';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getUserProfile = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        
        if (!userId) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }
        
        const result = await pool.query(
            'SELECT id, full_name, email, phone_number, role, is_active, created_at FROM users WHERE id = $1',
            [userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error en getUserProfile:', error);
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
};

export const updateUserProfile = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const { full_name, phone_number } = req.body;
        
        if (!userId) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }
        
        const result = await pool.query(
            'UPDATE users SET full_name = $1, phone_number = $2 WHERE id = $3 RETURNING id, full_name, email, phone_number, role',
            [full_name, phone_number, userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error en updateUserProfile:', error);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
};