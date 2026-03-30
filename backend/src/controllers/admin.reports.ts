import { Request, Response } from 'express';
import { pool } from '../index';
import { AuthRequest } from '../middlewares/auth.middleware';

// Helper to handle dates
const buildDateFilter = (start_date: any, end_date: any, dateField: string, params: any[], paramCount: number) => {
    let query = '';
    if (start_date) {
        paramCount++;
        query += ` AND DATE(${dateField}) >= $${paramCount}`;
        params.push(start_date);
    }
    if (end_date) {
        paramCount++;
        query += ` AND DATE(${dateField}) <= $${paramCount}`;
        params.push(end_date);
    }
    return { query, paramCount };
};

// Reporte 1: Ventas y Apuestas
export const getSalesReport = async (req: AuthRequest, res: Response) => {
  const { start_date, end_date } = req.query;
  console.log('[REPORTE VENTAS] Parámetros:', { start_date, end_date });
  try {
      const query = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total_bets,
          SUM(total_amount) as total_amount,
          COUNT(DISTINCT user_id) as unique_players
        FROM bets
        WHERE created_at BETWEEN $1 AND ($2::date + interval '1 day')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;
      const result = await pool.query(query, [start_date, end_date]);
      console.log('[REPORTE VENTAS] Registros encontrados:', result.rows.length);
      res.json(result.rows);
  } catch (err) { res.status(500).json({error: 'Error al obtener reporte de ventas'}) }
};

// Reporte 2: Jugadores (activos/inactivos)
export const getPlayersReport = async (req: AuthRequest, res: Response) => {
  const { start_date, end_date, status } = req.query;
  console.log('[REPORTE JUGADORES] Parámetros:', { start_date, end_date, status });
  try {
      let query = `
        SELECT 
          id, username as name, email, phone, role, 
          status as status,
          created_at as registered_date,
          (SELECT COUNT(*) FROM bets WHERE user_id = users.id) as total_bets,
          (SELECT COALESCE(SUM(total_amount), 0) FROM bets WHERE user_id = users.id) as total_bet_amount
        FROM users
        WHERE created_at BETWEEN $1 AND ($2::date + interval '1 day')
      `;
      
      if (status === 'ACTIVO') query += ` AND status = 'ACTIVE'`;
      if (status === 'INACTIVO') query += ` AND status = 'INACTIVE'`;
      
      query += ` ORDER BY created_at DESC`;
      
      const result = await pool.query(query, [start_date, end_date]);
      console.log('[REPORTE JUGADORES] Registros encontrados:', result.rows.length);
      res.json(result.rows);
  } catch (err) { res.status(500).json({error: 'Error al obtener reporte de jugadores'}) }
};

// Reporte 3: Recargas SINPE
export const getSinpeDepositsReport = async (req: AuthRequest, res: Response) => {
  const { start_date, end_date } = req.query;
  console.log('[REPORTE SINPE] Parámetros:', { start_date, end_date });
  try {
      const query = `
        SELECT 
          sd.*,
          u.username as user_name,
          u.email as user_email
        FROM sinpe_deposits sd
        JOIN users u ON sd.user_id = u.id
        WHERE sd.created_at BETWEEN $1 AND ($2::date + interval '1 day')
        ORDER BY sd.created_at DESC
      `;
      const result = await pool.query(query, [start_date, end_date]);
      console.log('[REPORTE SINPE] Registros encontrados:', result.rows.length);
      res.json(result.rows);
  } catch (err) { res.status(500).json({error: 'Error al obtener reporte sinpe'}) }
};

// Reporte 4: Retiros (SINPE/Banco)
export const getWithdrawalsReport = async (req: AuthRequest, res: Response) => {
  const { start_date, end_date, type } = req.query;
  console.log('[REPORTE RETIROS] Parámetros:', { start_date, end_date, type });
  try {
      let query = `
        SELECT 
          wr.*,
          u.username as user_name,
          u.email as user_email,
          u.phone as user_phone
        FROM withdrawals wr
        JOIN users u ON wr.user_id = u.id
        WHERE wr.created_at BETWEEN $1 AND ($2::date + interval '1 day')
      `;
      
      if (type === 'SINPE') query += ` AND wr.method = 'SINPE'`;
      if (type === 'IBAN') query += ` AND wr.method = 'IBAN'`;
      if (type === 'BANCO') query += ` AND wr.method = 'BANCO'`;
      
      query += ` ORDER BY wr.created_at DESC`;
      
      const result = await pool.query(query, [start_date, end_date]);
      console.log('[REPORTE RETIROS] Registros encontrados:', result.rows.length);
      res.json(result.rows);
  } catch (err) { res.status(500).json({error: 'Error al obtener reporte retiros'}) }
};

// Reporte 5: Premios Pagados
export const getWinnersReport = async (req: AuthRequest, res: Response) => {
  const { start_date, end_date } = req.query;
  console.log('[REPORTE PREMIOS] Parámetros:', { start_date, end_date });
  try {
      const query = `
        SELECT 
          w.*,
          u.username as user_name,
          u.email as user_email,
          u.phone as user_phone,
          d.lottery_type,
          d.draw_date,
          d.draw_time
        FROM winnings w
        JOIN users u ON w.user_id = u.id
        JOIN draws d ON w.draw_id = d.id
        WHERE w.created_at BETWEEN $1 AND ($2::date + interval '1 day')
        ORDER BY w.created_at DESC
      `;
      const result = await pool.query(query, [start_date, end_date]);
      console.log('[REPORTE PREMIOS] Registros encontrados:', result.rows.length);
      res.json(result.rows);
  } catch (err) { res.status(500).json({error: 'Error al obtener reporte premios'}) }
};

export const getDashboardReport = async (req: AuthRequest, res: Response) => {
  console.log('[DASHBOARD] Generando resumen...');
  try {
      const timeZone = 'America/Costa_Rica';
      const today = new Date().toLocaleDateString('en-CA', { timeZone });
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('en-CA', { timeZone });
      
      const queries = {
        totalPlayers: `SELECT COUNT(*) as count FROM users WHERE role = 'PLAYER'`,
        activePlayers: `SELECT COUNT(*) as count FROM users WHERE role = 'PLAYER' AND status = 'ACTIVE'`,
        todaySales: `SELECT COALESCE(SUM(total_amount), 0) as sum FROM bets WHERE DATE(created_at) = $1`,
        monthSales: `SELECT COALESCE(SUM(total_amount), 0) as sum FROM bets WHERE DATE(created_at) >= $1`,
        pendingWithdrawals: `SELECT COALESCE(SUM(amount), 0) as sum FROM withdrawals WHERE status = 'PENDING'`,
        todaySinpe: `SELECT COALESCE(SUM(amount), 0) as sum FROM sinpe_deposits WHERE DATE(created_at) = $1 AND status = 'COMPLETED'`,
        totalWinnings: `SELECT COALESCE(SUM(amount), 0) as sum FROM winnings WHERE DATE(created_at) >= $1`
      };
      
      const [tP, aP, tS, mS, pW, tSinpe, tW] = await Promise.all([
        pool.query(queries.totalPlayers),
        pool.query(queries.activePlayers),
        pool.query(queries.todaySales, [today]),
        pool.query(queries.monthSales, [firstDayOfMonth]),
        pool.query(queries.pendingWithdrawals),
        pool.query(queries.todaySinpe, [today]),
        pool.query(queries.totalWinnings, [firstDayOfMonth])
      ]);

      const results = {
        totalPlayers: parseInt(tP.rows[0].count),
        activePlayers: parseInt(aP.rows[0].count),
        todaySales: parseFloat(tS.rows[0].sum),
        monthSales: parseFloat(mS.rows[0].sum),
        pendingWithdrawals: parseFloat(pW.rows[0].sum),
        todaySinpe: parseFloat(tSinpe.rows[0].sum),
        totalWinnings: parseFloat(tW.rows[0].sum)
      };
      
      console.log('[DASHBOARD] Resumen generado:', results);
      res.json(results);
  } catch (err) { res.status(500).json({error: 'Error'}) }
};
