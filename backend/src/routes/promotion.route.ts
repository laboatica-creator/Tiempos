import { Router, Request, Response } from 'express';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';
import { pool } from '../database/db';

const router = Router();

router.use(authenticateJWT, requireRole(['ADMIN']));

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM promotions ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error listing promotions:', err);
    res.status(500).json({ error: 'Error al listar promociones' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const { name, description, type, bonus_amount, is_active, start_date, end_date } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO promotions (name, description, type, bonus_amount, is_active, start_date, end_date) 
       VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), NULLIF($7, '')) RETURNING *`,
      [name, description, type, bonus_amount, is_active ?? true, start_date || null, end_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error creating promotion:', err);
    res.status(500).json({ error: 'Error al crear promoción' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, type, bonus_amount, is_active, start_date, end_date } = req.body;
  try {
    const result = await pool.query(
      `UPDATE promotions 
       SET name = $1, description = $2, type = $3, bonus_amount = $4, is_active = $5, 
           start_date = NULLIF($6, ''), end_date = NULLIF($7, ''), updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [name, description, type, bonus_amount, is_active, start_date || null, end_date || null, id]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error updating promotion:', err);
    res.status(500).json({ error: 'Error al actualizar promoción' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM promotions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting promotion:', err);
    res.status(500).json({ error: 'Error al eliminar promoción' });
  }
});

export default router;