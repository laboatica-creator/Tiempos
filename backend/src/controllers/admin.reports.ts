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

export const getSalesReport = async (req: AuthRequest, res: Response) => {
    try {
        console.log('Reporte ventas - parámetros:', req.query);
        const { start_date, end_date, format = 'json', page = 1, limit = 50 } = req.query;
        let params: any[] = [];
        let paramCount = 0;
        
        let query = `
            SELECT b.id, b.created_at, b.total_amount, b.status, u.username, u.email, d.lottery_type, d.draw_date, d.draw_time
            FROM bets b
            JOIN users u ON b.user_id = u.id
            JOIN draws d ON b.draw_id = d.id
            WHERE 1=1
        `;

        const filter = buildDateFilter(start_date, end_date, 'b.created_at', params, paramCount);
        query += filter.query;
        paramCount = filter.paramCount;

        query += ` ORDER BY b.created_at DESC`;

        if (format === 'json') {
            const offset = (Number(page) - 1) * Number(limit);
            paramCount++;
            query += ` LIMIT $${paramCount}`;
            params.push(Number(limit));
            paramCount++;
            query += ` OFFSET $${paramCount}`;
            params.push(offset);
        }

        const result = await pool.query(query, params);
        console.log('Datos encontrados (Ventas):', result.rows.length);

        if (format === 'csv') {
            const headers = ['ID', 'Fecha', 'Monto', 'Estado', 'Usuario', 'Correo', 'Lotería', 'Fecha Sorteo', 'Hora Sorteo'];
            const csvRows = result.rows.map(r => 
                [r.id, r.created_at, r.total_amount, r.status, r.username, r.email, r.lottery_type, new Date(r.draw_date).toLocaleDateString(), r.draw_time].join(',')
            );
            const csv = [headers.join(','), ...csvRows].join('\n');
            res.header('Content-Type', 'text/csv');
            res.attachment('reporte-ventas.csv');
            return res.send(csv);
        }

        res.json({ data: result.rows, pagination: { page: Number(page), limit: Number(limit) } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getPlayersReport = async (req: AuthRequest, res: Response) => {
    try {
        console.log('Reporte jugadores - parámetros:', req.query);
        const { start_date, end_date, format = 'json', page = 1, limit = 50 } = req.query;
        let params: any[] = [];
        let query = `SELECT id, username, email, role, phone, created_at, wallet_balance, status FROM users WHERE 1=1`;
        
        let paramCount = 0;
        const filter = buildDateFilter(start_date, end_date, 'created_at', params, paramCount);
        query += filter.query;
        paramCount = filter.paramCount;

        query += ` ORDER BY created_at DESC`;

        if (format === 'json') {
            const offset = (Number(page) - 1) * Number(limit);
            query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
            params.push(Number(limit), offset);
        }

        const result = await pool.query(query, params);

        if (format === 'csv') {
            const headers = ['ID', 'Usuario', 'Correo', 'Rol', 'Teléfono', 'Fecha Registro', 'Saldo'];
            const csvRows = result.rows.map(r => 
                [r.id, r.username, r.email, r.role, r.phone, r.created_at, r.wallet_balance].join(',')
            );
            res.header('Content-Type', 'text/csv');
            res.attachment('reporte-jugadores.csv');
            return res.send([headers.join(','), ...csvRows].join('\n'));
        }

        res.json({ data: result.rows, pagination: { page: Number(page), limit: Number(limit) } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getWithdrawalsReport = async (req: AuthRequest, res: Response) => {
    try {
        console.log('Reporte retiros - parámetros:', req.query);
        const { start_date, end_date, format = 'json', page = 1, limit = 50 } = req.query;
        let params: any[] = [];
        let query = `
            SELECT w.id, w.amount, w.status, w.method, w.details, w.created_at, u.username, u.email 
            FROM withdrawals w JOIN users u ON w.user_id = u.id WHERE 1=1
        `;
        let paramCount = 0;
        const filter = buildDateFilter(start_date, end_date, 'w.created_at', params, paramCount);
        query += filter.query + ` ORDER BY w.created_at DESC`;
        paramCount = filter.paramCount;

        if (format === 'json') {
            const offset = (Number(page) - 1) * Number(limit);
            query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
            params.push(Number(limit), offset);
        }

        const result = await pool.query(query, params);

        if (format === 'csv') {
            const headers = ['ID', 'Usuario', 'Monto', 'Método', 'Estado', 'Fecha', 'Detalles'];
            const csvRows = result.rows.map(r => [r.id, r.username, r.amount, r.method, r.status, r.created_at, `"${r.details}"`].join(','));
            res.header('Content-Type', 'text/csv');
            res.attachment('reporte-retiros.csv');
            return res.send([headers.join(','), ...csvRows].join('\n'));
        }

        res.json({ data: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal error' });
    }
};

export const getSinpeDepositsReport = async (req: AuthRequest, res: Response) => {
    try {
        console.log('Reporte SINPE - parámetros:', req.query);
        const { start_date, end_date, format = 'json', page = 1, limit = 50 } = req.query;
        let params: any[] = [];
        let query = `
            SELECT s.id, s.amount, s.status, s.reference_number, s.created_at, u.username, u.email 
            FROM sinpe_deposits s JOIN users u ON s.user_id = u.id WHERE 1=1
        `;
        let paramCount = 0;
        const filter = buildDateFilter(start_date, end_date, 's.created_at', params, paramCount);
        query += filter.query + ` ORDER BY s.created_at DESC`;
        paramCount = filter.paramCount;

        if (format === 'json') {
            const offset = (Number(page) - 1) * Number(limit);
            query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
            params.push(Number(limit), offset);
        }

        const result = await pool.query(query, params);

        if (format === 'csv') {
            const headers = ['ID', 'Usuario', 'Monto', 'Referencia', 'Estado', 'Fecha'];
            const csvRows = result.rows.map(r => [r.id, r.username, r.amount, r.reference_number, r.status, r.created_at].join(','));
            res.header('Content-Type', 'text/csv');
            res.attachment('reporte-sinpe.csv');
            return res.send([headers.join(','), ...csvRows].join('\n'));
        }

        res.json({ data: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal error' });
    }
};

export const getWinnersReport = async (req: AuthRequest, res: Response) => {
    try {
        console.log('Reporte Ganadores - parámetros:', req.query);
        const { start_date, end_date, format = 'json', page = 1, limit = 50 } = req.query;
        let params: any[] = [];
        let query = `
            SELECT w.id, w.amount, w.created_at, u.username, u.phone, d.lottery_type, d.draw_date, d.draw_time 
            FROM winnings w 
            JOIN users u ON w.user_id = u.id 
            JOIN draws d ON w.draw_id = d.id 
            WHERE 1=1
        `;
        let paramCount = 0;
        const filter = buildDateFilter(start_date, end_date, 'w.created_at', params, paramCount);
        query += filter.query + ` ORDER BY w.created_at DESC`;
        paramCount = filter.paramCount;

        if (format === 'json') {
            const offset = (Number(page) - 1) * Number(limit);
            query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
            params.push(Number(limit), offset);
        }

        const result = await pool.query(query, params);

        if (format === 'csv') {
            const headers = ['ID', 'Usuario', 'Teléfono', 'Premios', 'Tipo Lotería', 'Sorteo Fecha', 'Hora Sorteo', 'Fecha Premiado'];
            const csvRows = result.rows.map(r => [r.id, r.username, r.phone, r.amount, r.lottery_type, new Date(r.draw_date).toLocaleDateString(), r.draw_time, r.created_at].join(','));
            res.header('Content-Type', 'text/csv');
            res.attachment('reporte-ganadores.csv');
            return res.send([headers.join(','), ...csvRows].join('\n'));
        }

        res.json({ data: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal error' });
    }
};

export const getDashboardReport = async (req: AuthRequest, res: Response) => {
    try {
        const { start_date, end_date } = req.query;
        // Dashboard uses only date ranges without pagination
        let params: any[] = [];
        let dateCondition = '';
        let paramCount = 0;

        if (start_date) {
            paramCount++;
            dateCondition += ` AND DATE(created_at) >= $${paramCount}`;
            params.push(start_date);
        }
        if (end_date) {
            paramCount++;
            dateCondition += ` AND DATE(created_at) <= $${paramCount}`;
            params.push(end_date);
        }

        const totalPlayers = await pool.query(`SELECT COUNT(*) FROM users`);
        
        // Fix for date fields with different names
        const buildCondition = (field: string) => {
            let cond = '';
            let pC = 0;
            let pArr = [];
            if (start_date) { pC++; cond += ` AND DATE(${field}) >= $${pC}`; pArr.push(start_date); }
            if (end_date) { pC++; cond += ` AND DATE(${field}) <= $${pC}`; pArr.push(end_date); }
            return { cond, pArr };
        };

        const salesCond = buildCondition('created_at');
        const sales = await pool.query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM bets WHERE status != 'CANCELLED' ${salesCond.cond}`, salesCond.pArr);
        
        const withdrawalsCond = buildCondition('created_at');
        const withdrawals = await pool.query(`SELECT COUNT(*) as pending_count FROM withdrawals WHERE status = 'PENDING' ${withdrawalsCond.cond}`, withdrawalsCond.pArr);
        
        const sinpeCond = buildCondition('created_at');
        const sinpeToday = await pool.query(`SELECT COUNT(*) as sinpe_count, COALESCE(SUM(amount), 0) as sinpe_total FROM sinpe_deposits WHERE status = 'COMPLETED' ${sinpeCond.cond}`, sinpeCond.pArr);

        // Daily chart
        const chartData = await pool.query(`
            SELECT DATE(created_at) as date, COALESCE(SUM(total_amount), 0) as total 
            FROM bets WHERE status != 'CANCELLED' ${salesCond.cond}
            GROUP BY DATE(created_at) ORDER BY DATE(created_at) ASC LIMIT 30
        `, salesCond.pArr);

        res.json({
            total_players: parseInt(totalPlayers.rows[0].count),
            total_sales: parseFloat(sales.rows[0].total),
            pending_withdrawals: parseInt(withdrawals.rows[0].pending_count),
            sinpe_deposits_count: parseInt(sinpeToday.rows[0].sinpe_count),
            sinpe_deposits_total: parseFloat(sinpeToday.rows[0].sinpe_total),
            chart_data: chartData.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal error' });
    }
};
