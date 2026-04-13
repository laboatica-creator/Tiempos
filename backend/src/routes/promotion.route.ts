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
    res.status(500).json({ error: 'Error al listar promociones', details: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const { name, description, type, bonus_amount, is_active } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO promotions (name, description, type, bonus_amount, is_active) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description, type, bonus_amount, is_active ?? true]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error creating promotion:', err);
    res.status(500).json({ error: 'Error al crear promoción', details: err.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, type, bonus_amount, is_active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE promotions 
       SET name = $1, description = $2, type = $3, bonus_amount = $4, is_active = $5, updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [name, description, type, bonus_amount, is_active, id]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error updating promotion:', err);
    res.status(500).json({ error: 'Error al actualizar promoción', details: err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  const promotionId = req.params.id;
  try {
    // 🔥 Primero eliminar las aplicaciones de esta promoción (evita error de clave foránea)
    await pool.query('DELETE FROM promotion_applications WHERE promotion_id = $1', [promotionId]);
    
    // 🔥 Luego eliminar la promoción
    await pool.query('DELETE FROM promotions WHERE id = $1', [promotionId]);
    
    res.json({ success: true, message: 'Promoción eliminada correctamente' });
  } catch (err: any) {
    console.error('Error deleting promotion:', err);
    res.status(500).json({ error: 'Error al eliminar promoción', details: err.message });
  }
});

export default router;