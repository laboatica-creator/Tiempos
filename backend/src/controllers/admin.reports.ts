import { Response } from 'express';
import { pool } from '../database/db';
import { AuthRequest } from '../middlewares/auth.middleware';

/**
 * Reporte 1: Ventas y Apuestas
 */
export const getSalesReport = async (req: AuthRequest, res: Response) => {
  const { start_date, end_date } = req.query;
  try {
      const query = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total_bets,
          COALESCE(SUM(total_amount), 0) as total_amount,
          COUNT(DISTINCT user_id) as unique_players
        FROM bets
        WHERE DATE(created_at) BETWEEN $1 AND $2 AND status != 'CANCELLED'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;
      const result = await pool.query(query, [start_date, end_date]);
      res.json(result.rows);
  } catch (err: any) {
      res.status(500).json({ error: 'Error al obtener reporte de ventas' });
  }
};

/**
 * Reporte 2: Jugadores
 */
export const getPlayersReport = async (req: AuthRequest, res: Response) => {
  const { start_date, end_date, status } = req.query;
  try {
      let query = `
        SELECT 
          u.id, u.full_name as username, u.email, u.phone_number as phone, u.role, 
          CASE WHEN u.is_active THEN 'ACTIVO' ELSE 'INACTIVO' END as status,
          u.created_at as registered_date,
          (SELECT COUNT(*) FROM bets WHERE user_id = u.id) as total_bets,
          (SELECT COALESCE(SUM(total_amount), 0) FROM bets WHERE user_id = u.id) as total_bet_amount
        FROM users u
        WHERE u.role = 'CUSTOMER' AND DATE(u.created_at) BETWEEN $1 AND $2
      `;
      if (status === 'ACTIVO') query += ' AND u.is_active = true';
      if (status === 'INACTIVO') query += ' AND u.is_active = false';
      query += ` ORDER BY u.created_at DESC`;
      const result = await pool.query(query, [start_date, end_date]);
      res.json(result.rows);
  } catch (err: any) {
      res.status(500).json({ error: 'Error al obtener reporte de jugadores' });
  }
};

/**
 * Reporte 3: Recargas SINPE
 */
export const getSinpeDepositsReport = async (req: AuthRequest, res: Response) => {
  const { start_date, end_date } = req.query;
  try {
      const query = `
        SELECT sd.*, u.full_name as user_name, u.email as user_email
        FROM sinpe_deposits sd JOIN users u ON sd.user_id = u.id
        WHERE DATE(sd.created_at) BETWEEN $1 AND $2
        ORDER BY sd.created_at DESC
      `;
      const result = await pool.query(query, [start_date, end_date]);
      res.json(result.rows);
  } catch (err: any) {
      res.status(500).json({ error: 'Error al obtener reporte sinpe' });
  }
};

/**
 * Reporte 4: Retiros
 */
export const getWithdrawalsReport = async (req: AuthRequest, res: Response) => {
  const { start_date, end_date, type } = req.query;
  try {
      let query = `
        SELECT wr.*, u.full_name as user_name, u.email as user_email
        FROM withdrawal_requests wr JOIN users u ON wr.user_id = u.id
        WHERE DATE(wr.created_at) BETWEEN $1 AND $2
      `;
      if (type && type !== 'ALL') query += ` AND wr.method = '${type}'`;
      query += ` ORDER BY wr.created_at DESC`;
      const result = await pool.query(query, [start_date, end_date]);
      res.json(result.rows);
  } catch (err: any) {
      res.status(500).json({ error: 'Error al obtener reporte retiros' });
  }
};

/**
 * Reporte 5: Premios
 */
export const getWinnersReport = async (req: AuthRequest, res: Response) => {
  const { start_date, end_date } = req.query;
  try {
      const query = `
        SELECT w.*, u.full_name as user_name, d.lottery_type, d.draw_date
        FROM winnings w JOIN users u ON w.user_id = u.id JOIN draws d ON w.draw_id = d.id
        WHERE DATE(w.created_at) BETWEEN $1 AND $2
        ORDER BY w.created_at DESC
      `;
      const result = await pool.query(query, [start_date, end_date]);
      res.json(result.rows);
  } catch (err: any) {
      res.status(500).json({ error: 'Error al obtener reporte premios' });
  }
};

/**
 * Reporte 6: Dashboard Resumen (CORREGIDO PARA FRONTEND)
 */
export const getDashboardReport = async (req: AuthRequest, res: Response) => {
  try {
      const CTZ = 'America/Costa_Rica';
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: CTZ }).format(new Date());
      const monthStart = today.substring(0, 7) + '-01';
      
      const queries = {
        totalPlayers: `SELECT COUNT(*) as count FROM users WHERE role = 'CUSTOMER'`,
        todaySales: `SELECT COALESCE(SUM(total_amount), 0) as sum FROM bets WHERE DATE(created_at) = $1 AND status != 'CANCELLED'`,
        pendingWithdrawals: `SELECT COUNT(*) as count FROM withdrawal_requests WHERE status = 'PENDING'`,
        sinpeDepositsTotal: `SELECT COALESCE(SUM(amount), 0) as sum FROM sinpe_deposits WHERE DATE(created_at) = $1 AND status = 'APPROVED'`,
        sinpeDepositsCount: `SELECT COUNT(*) as count FROM sinpe_deposits WHERE status = 'PENDING'`,
        totalWinnings: `SELECT COALESCE(SUM(amount), 0) as sum FROM winnings WHERE DATE(created_at) >= $1`,
        chartData: `SELECT DATE(created_at) as date, SUM(total_amount) as total FROM bets WHERE created_at >= NOW() - INTERVAL '30 days' AND status != 'CANCELLED' GROUP BY DATE(created_at) ORDER BY date ASC`
      };
      
      const [tP, tS, pW, sDT, sDC, tW, cD] = await Promise.all([
        pool.query(queries.totalPlayers),
        pool.query(queries.todaySales, [today]),
        pool.query(queries.pendingWithdrawals),
        pool.query(queries.sinpeDepositsTotal, [today]),
        pool.query(queries.sinpeDepositsCount),
        pool.query(queries.totalWinnings, [monthStart]),
        pool.query(queries.chartData)
      ]);

      res.json({
        total_players: parseInt(tP.rows[0].count),
        total_sales: parseFloat(tS.rows[0].sum),
        pending_withdrawals: parseInt(pW.rows[0].count),
        sinpe_deposits_total: parseFloat(sDT.rows[0].sum),
        sinpe_deposits_count: parseInt(sDC.rows[0].count),
        total_winnings: parseFloat(tW.rows[0].sum),
        chart_data: cD.rows
      });
  } catch (err: any) {
      console.error('[DASHBOARD ERROR]:', err);
      res.status(500).json({ error: 'Error al generar dashboard' });
  }
};