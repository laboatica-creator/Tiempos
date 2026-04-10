import { Response } from 'express';
import { pool } from '../database/db';
import { AuthRequest } from '../middlewares/auth.middleware';

/**
 * Reporte de Dashboard: Totales del día y estadísticas generales
 */
export const getDashboardReport = async (req: AuthRequest, res: Response) => {
  try {
      const CTZ = 'America/Costa_Rica';
      const todayDate = new Intl.DateTimeFormat('en-CA', { timeZone: CTZ }).format(new Date());
      const monthStart = todayDate.substring(0, 7) + '-01';
      
      // Consultas robustas usando la zona horaria de las apuestas
      const queries = {
        totalPlayers: `SELECT COUNT(*)::int as count FROM users WHERE role = 'CUSTOMER'`,
        todaySales: `SELECT COALESCE(SUM(total_amount), 0)::float as total FROM bets WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica')::date = $1 AND status != 'CANCELLED'`,
        pendingWithdrawals: `SELECT COUNT(*)::int as count FROM withdrawal_requests WHERE status = 'PENDING'`,
        sinpeDepositsTotal: `SELECT COALESCE(SUM(amount), 0)::float as total FROM sinpe_deposits WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica')::date = $1 AND status = 'APPROVED'`,
        sinpeDepositsCount: `SELECT COUNT(*)::int as count FROM sinpe_deposits WHERE status = 'PENDING'`,
        totalWinnings: `SELECT COALESCE(SUM(amount), 0)::float as total FROM winnings WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica')::date >= $1`,
        chartData: `
            SELECT 
                (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica')::date as date, 
                SUM(total_amount)::float as total 
            FROM bets 
            WHERE created_at >= NOW() - INTERVAL '30 days' AND status != 'CANCELLED' 
            GROUP BY (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica')::date 
            ORDER BY date ASC
        `
      };
      
      const [tP, tS, pW, sDT, sDC, tW, cD] = await Promise.all([
        pool.query(queries.totalPlayers),
        pool.query(queries.todaySales, [todayDate]),
        pool.query(queries.pendingWithdrawals),
        pool.query(queries.sinpeDepositsTotal, [todayDate]),
        pool.query(queries.sinpeDepositsCount),
        pool.query(queries.totalWinnings, [monthStart]),
        pool.query(queries.chartData)
      ]);

      const stats = {
        total_players: tP.rows[0].count,
        total_sales: tS.rows[0].total,
        pending_withdrawals: pW.rows[0].count,
        sinpe_deposits_total: sDT.rows[0].total,
        sinpe_deposits_count: sDC.rows[0].count,
        total_winnings: tW.rows[0].total,
        chart_data: cD.rows
      };

      res.json(stats);
  } catch (err: any) {
      console.error('[DASHBOARD REPORT ERROR]:', err);
      res.status(500).json({ error: 'Error al generar estadísticas del dashboard' });
  }
};

export const getSalesReport = async (req: AuthRequest, res: Response) => {
  const { start_date, end_date } = req.query;
  try {
      const query = `
        SELECT 
          (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica')::date as date,
          COUNT(*) as total_bets,
          COALESCE(SUM(total_amount), 0) as total_amount,
          COUNT(DISTINCT user_id) as unique_players
        FROM bets
        WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica')::date BETWEEN $1 AND $2 AND status != 'CANCELLED'
        GROUP BY 1
        ORDER BY 1 DESC
      `;
      const result = await pool.query(query, [start_date, end_date]);
      res.json(result.rows);
  } catch (err: any) {
      res.status(500).json({ error: 'Error al obtener reporte de ventas' });
  }
};

export const getPlayersReport = async (req: AuthRequest, res: Response) => {
  const { start_date, end_date } = req.query;
  try {
      const query = `
        SELECT 
          u.full_name as username, u.email, u.phone_number as phone, u.is_active,
          u.created_at as registered_date,
          (SELECT COUNT(*) FROM bets WHERE user_id = u.id) as total_bets,
          (SELECT COALESCE(SUM(total_amount), 0) FROM bets WHERE user_id = u.id) as total_bet_amount
        FROM users u
        WHERE u.role = 'CUSTOMER' AND (u.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica')::date BETWEEN $1 AND $2
        ORDER BY u.created_at DESC
      `;
      const result = await pool.query(query, [start_date, end_date]);
      res.json(result.rows);
  } catch (err: any) {
      res.status(500).json({ error: 'Error reporte jugadores' });
  }
};

export const getSinpeDepositsReport = async (req: AuthRequest, res: Response) => {
  const { start_date, end_date } = req.query;
  try {
      const query = `
        SELECT sd.*, u.full_name as user_name, u.email as user_email
        FROM sinpe_deposits sd JOIN users u ON sd.user_id = u.id
        WHERE (sd.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica')::date BETWEEN $1 AND $2
        ORDER BY sd.created_at DESC
      `;
      const result = await pool.query(query, [start_date, end_date]);
      res.json(result.rows);
  } catch (err: any) {
      res.status(500).json({ error: 'Error reporte sinpe' });
  }
};

export const getWithdrawalsReport = async (req: AuthRequest, res: Response) => {
  const { start_date, end_date } = req.query;
  try {
      const query = `
        SELECT wr.*, u.full_name as user_name, u.email as user_email, u.phone_number as user_phone
        FROM withdrawal_requests wr JOIN users u ON wr.user_id = u.id
        WHERE (wr.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica')::date BETWEEN $1 AND $2
        ORDER BY wr.created_at DESC
      `;
      const result = await pool.query(query, [start_date, end_date]);
      res.json(result.rows);
  } catch (err: any) {
      res.status(500).json({ error: 'Error reporte retiros' });
  }
};

export const getWinnersReport = async (req: AuthRequest, res: Response) => {
  const { start_date, end_date } = req.query;
  try {
      const query = `
        SELECT w.*, u.full_name as user_name, u.email as user_email, u.phone_number as user_phone, 
               d.lottery_type, d.draw_date, d.draw_time
        FROM winnings w 
        JOIN users u ON w.user_id = u.id 
        JOIN draws d ON w.draw_id = d.id
        WHERE (w.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Costa_Rica')::date BETWEEN $1 AND $2
        ORDER BY w.created_at DESC
      `;
      const result = await pool.query(query, [start_date, end_date]);
      res.json(result.rows);
  } catch (err: any) {
      res.status(500).json({ error: 'Error reporte premios' });
  }
};