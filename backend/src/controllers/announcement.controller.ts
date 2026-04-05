import { Request, Response } from 'express';
import { pool } from '../database/db';

export const getActiveAnnouncement = async (req: Request, res: Response) => {
  try {
    const timeZone = 'America/Costa_Rica';
    const now = new Date().toLocaleDateString('en-CA', { timeZone }) + ' ' + new Date().toLocaleTimeString('en-CA', { timeZone, hour12: false });
    
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
  } catch (error: any) {
    console.error('[ANNOUNCEMENTS] Error fetching announcement:', error);
    res.status(500).json({ error: 'Error al obtener anuncio activo' });
  }
};

export const getAllAnnouncements = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT * FROM announcements ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Error al listar anuncios' });
  }
};

export const createAnnouncement = async (req: Request, res: Response) => {
  const { message, is_active, interval_seconds, duration_seconds } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO announcements (message, is_active, interval_seconds, duration_seconds) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [message, is_active ?? true, interval_seconds || 300, duration_seconds || 4]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: 'Error al crear anuncio', details: error.message });
  }
};

export const updateAnnouncement = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { message, is_active, interval_seconds, duration_seconds } = req.body;
  try {
    const result = await pool.query(
      `UPDATE announcements 
       SET message = $1, is_active = $2, interval_seconds = $3, duration_seconds = $4, updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [message, is_active, interval_seconds, duration_seconds, id]
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ error: 'Error al actualizar anuncio', details: error.message });
  }
};

export const deleteAnnouncement = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM announcements WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ error: 'Error al eliminar anuncio', details: error.message });
  }
};