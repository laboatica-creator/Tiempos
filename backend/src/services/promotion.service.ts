import { pool } from '../database/db';

export const applyNewUserBonus = async (userId: string) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM promotions 
       WHERE type = 'NEW_USER_BONUS' 
         AND is_active = true`,
      []
    );

    for (const promo of result.rows) {
      // Verificar si ya se aplicó a este usuario
      const existing = await client.query(
        `SELECT id FROM promotion_applications 
         WHERE promotion_id = $1 AND user_id = $2`,
        [promo.id, userId]
      );

      if (existing.rows.length === 0) {
        await client.query('BEGIN');
        
        // Obtener wallet_id
        const walletResult = await client.query(
          `SELECT id FROM wallets WHERE user_id = $1`,
          [userId]
        );
        
        if (walletResult.rows.length === 0) {
          console.log(`[PROMO] Usuario ${userId} no tiene wallet`);
          await client.query('ROLLBACK');
          continue;
        }
        
        const walletId = walletResult.rows[0].id;
        
        // Actualizar wallet
        await client.query(
          `UPDATE wallets SET balance = balance + $1, total_deposits = total_deposits + $1 
           WHERE user_id = $2`,
          [promo.bonus_amount, userId]
        );
        
        // Registrar transacción
        await client.query(
          `INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
           VALUES ($1, 'BONUS', $2, $3, $4)`,
          [walletId, promo.bonus_amount, `Promoción: ${promo.name}`, promo.id]
        );
        
        // Registrar aplicación
        await client.query(
          `INSERT INTO promotion_applications (promotion_id, user_id, amount) 
           VALUES ($1, $2, $3)`,
          [promo.id, userId, promo.bonus_amount]
        );
        
        // Actualizar contador
        await client.query(
          `UPDATE promotions SET applied_count = applied_count + 1 WHERE id = $1`,
          [promo.id]
        );
        
        await client.query('COMMIT');
        console.log(`[PROMO] Bono aplicado a usuario ${userId}: ₡${promo.bonus_amount}`);
      }
    }
  } catch (error) {
    console.error('[PROMO] Error aplicando bono:', error);
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
};