import { Request, Response } from 'express';
import { pool } from '../database/db';

export const getActiveAnnouncement = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const result = await pool.query(
      `SELECT id, message, duration_seconds, interval_seconds 
       FROM announcements 
       WHERE is_active = true 
         AND (start_date IS NULL OR start_date <= $1)
         AND (end_date IS NULL OR end_date >= $1)
       ORDER BY created_at DESC 
       LIMIT 1`,
      [now]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({ error: 'Error al obtener anuncio' });
  }
};

export const getAllAnnouncements = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM announcements ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Error al listar anuncios' });
  }
};

export const createAnnouncement = async (req: Request, res: Response) => {
  const { message, is_active, start_date, end_date, interval_seconds, duration_seconds } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO announcements (message, is_active, start_date, end_date, interval_seconds, duration_seconds) 
       VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), $5, $6) 
       RETURNING *`,
      [message, is_active ?? true, start_date || null, end_date || null, interval_seconds || 300, duration_seconds || 4]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: 'Error al crear anuncio' });
  }
};

export const deleteAnnouncement = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM announcements WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ error: 'Error al eliminar anuncio' });
  }
};