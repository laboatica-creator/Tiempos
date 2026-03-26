import { Request, Response } from 'express';
import { pool } from '../index';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
    try {
        const role = req.user?.role;
        const userId = req.user?.id;
        // Ensure today is the local date in Costa Rica
        const today = new Date().toLocaleDateString('en-CA'); 

        let salesQuery = `SELECT SUM(total_amount) as total FROM bets WHERE created_at::date = $1 AND status != 'CANCELLED'`;
        let winQuery = `SELECT SUM(amount) as total FROM winnings WHERE created_at::date = $1`;
        let userQuery = `SELECT COUNT(*) as total FROM users WHERE role = 'CUSTOMER'`;
        let sinpeQuery = `SELECT COUNT(*) as total FROM sinpe_deposits WHERE status = 'PENDING'`;
        let withdrawQuery = `SELECT COUNT(*) as total FROM withdrawal_requests WHERE status = 'PENDING'`;

        const queryParams: any[] = [today];
        const noParamQuery: any[] = [];
        const withdrawParams: any[] = [];

        if (role === 'FRANCHISE') {
            salesQuery = `SELECT SUM(b.total_amount) as total FROM bets b JOIN users u ON b.user_id = u.id WHERE b.created_at::date = $1 AND u.franchise_id = $2 AND b.status != 'CANCELLED'`;
            winQuery = `SELECT SUM(w.amount) as total FROM winnings w JOIN users u ON w.user_id = u.id WHERE w.created_at::date = $1 AND u.franchise_id = $2`;
            userQuery = `SELECT COUNT(*) as total FROM users WHERE role = 'CUSTOMER' AND franchise_id = $1`;
            sinpeQuery = `SELECT COUNT(*) as total FROM sinpe_deposits sd JOIN users u ON sd.user_id = u.id WHERE sd.status = 'PENDING' AND u.franchise_id = $1`;
            withdrawQuery = `SELECT COUNT(*) as total FROM withdrawal_requests wr JOIN users u ON wr.user_id = u.id WHERE wr.status = 'PENDING' AND u.franchise_id = $1`;
            queryParams.push(userId);
            noParamQuery.push(userId);
            withdrawParams.push(userId);
        }

        const salesRes = await pool.query(salesQuery, queryParams);
        const winningsRes = await pool.query(winQuery, queryParams);
        const usersRes = await pool.query(userQuery, noParamQuery);
        const pendingSinpe = await pool.query(sinpeQuery, noParamQuery);
        const pendingWithdrawals = await pool.query(withdrawQuery, withdrawParams);

        res.json({
            todaySales: salesRes.rows[0].total || 0,
            todayWinnings: winningsRes.rows[0].total || 0,
            totalUsers: usersRes.rows[0].total || 0,
            pendingSinpe: pendingSinpe.rows[0].total || 0,
            pendingWithdrawals: pendingWithdrawals.rows[0].total || 0
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getRecentTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const { startDate, endDate, player, type } = req.query;
        const role = req.user?.role;
        const currentUserId = req.user?.id;

        let query = `
             SELECT wt.*, u.full_name as user_name 
             FROM wallet_transactions wt
             JOIN wallets w ON wt.wallet_id = w.id
             JOIN users u ON w.user_id = u.id
             WHERE 1=1 `;
             
        const queryParams: any[] = [];
        
        if (role === 'FRANCHISE') {
            queryParams.push(currentUserId);
            query += ` AND u.franchise_id = $${queryParams.length}`;
        }
        
        if (startDate) {
            queryParams.push(startDate);
            query += ` AND wt.created_at::date >= $${queryParams.length}`;
        }
        
        if (endDate) {
            queryParams.push(endDate);
            query += ` AND wt.created_at::date <= $${queryParams.length}`;
        }
        
        if (player) {
            queryParams.push(`%${player}%`);
            query += ` AND (u.full_name ILIKE $${queryParams.length} OR u.email ILIKE $${queryParams.length} OR u.phone_number ILIKE $${queryParams.length})`;
        }
        
        if (type && type !== 'ALL') {
             queryParams.push(type);
             query += ` AND wt.type = $${queryParams.length}::tx_type`;
        }

        query += ` ORDER BY wt.created_at DESC LIMIT 100`;

        const result = await pool.query(query, queryParams);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching recent transactions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getAllPlayers = async (req: AuthRequest, res: Response) => {
    try {
        const role = req.user?.role;
        const userId = req.user?.id;

        let query = `
             SELECT u.id, u.full_name, u.national_id, u.phone_number, u.is_active, u.created_at, w.balance 
             FROM users u
             LEFT JOIN wallets w ON u.id = w.user_id
             WHERE u.role = 'CUSTOMER' ${role === 'FRANCHISE' ? 'AND u.franchise_id = $1' : ''}
             ORDER BY u.created_at DESC`;

        const queryParams = role === 'FRANCHISE' ? [userId] : [];
        const result = await pool.query(query, queryParams);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching players:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updatePlayer = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { full_name, email, is_active } = req.body;
    try {
        const result = await pool.query(
            `UPDATE users SET full_name = $1, email = $2, is_active = $3, updated_at = NOW() WHERE id = $4 AND role = 'CUSTOMER' RETURNING *`,
            [full_name, email, is_active, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Player not found' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating player:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deletePlayer = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`DELETE FROM users WHERE id = $1 AND role = 'CUSTOMER' RETURNING id`, [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Player not found' });
        res.json({ message: 'Player deleted successfully' });
    } catch (error) {
        console.error('Error deleting player:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getRiskExposure = async (req: AuthRequest, res: Response) => {
    const { lotteryType } = req.params;
    try {
        // Find the most recent OPEN draw for this lottery type
        const drawRes = await pool.query(
            `SELECT id FROM draws WHERE lottery_type = $1 AND status IN ('OPEN', 'CLOSED') ORDER BY draw_date ASC, draw_time ASC LIMIT 1`,
            [lotteryType]
        );

        if (drawRes.rows.length === 0) {
            return res.json({ exposure: {} });
        }

        const drawId = drawRes.rows[0].id;

        const exposureRes = await pool.query(
            `SELECT bi.number, SUM(bi.amount) as total_amount 
             FROM bet_items bi
             JOIN bets b ON bi.bet_id = b.id
             WHERE b.draw_id = $1 AND b.status != 'CANCELLED'
             GROUP BY bi.number`,
            [drawId]
        );

        const exposureMap: Record<string, number> = {};
        exposureRes.rows.forEach(row => {
            exposureMap[row.number] = parseFloat(row.total_amount);
        });

        res.json({ drawId, exposure: exposureMap });
    } catch (error) {
        console.error('Error fetching risk exposure:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getAllFranchises = async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.full_name, u.national_id, u.phone_number, u.email, u.is_active, u.created_at,
                    w.balance,
                    COUNT(p.id) as player_count
             FROM users u
             LEFT JOIN wallets w ON u.id = w.user_id
             LEFT JOIN users p ON p.franchise_id = u.id AND p.role = 'CUSTOMER'
             WHERE u.role = 'FRANCHISE'
             GROUP BY u.id, u.full_name, u.national_id, u.phone_number, u.email, u.is_active, u.created_at, w.balance
             ORDER BY u.created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching franchises:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteFranchise = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        // Unlink players from this franchise before deleting
        await pool.query(`UPDATE users SET franchise_id = NULL WHERE franchise_id = $1`, [id]);
        const result = await pool.query(
            `DELETE FROM users WHERE id = $1 AND role = 'FRANCHISE' RETURNING id`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Franquicia no encontrada.' });
        }
        res.json({ message: 'Franquicia eliminada exitosamente.' });
    } catch (error) {
        console.error('Error deleting franchise:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getAdmins = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.is_master) {
            return res.status(403).json({ error: 'Sólo el Administrador Maestro puede ver esta lista.' });
        }
        const result = await pool.query(
            `SELECT id, full_name, email, is_active, is_master, permissions, created_at FROM users WHERE role = 'ADMIN' ORDER BY is_master DESC, created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateAdminPermissions = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { permissions, is_active } = req.body;
        
        if (!req.user?.is_master) {
            return res.status(403).json({ error: 'No autorizado. Se requiere nivel maestro.' });
        }

        const result = await pool.query(
            `UPDATE users SET permissions = $1, is_active = $2, updated_at = NOW() WHERE id = $3 AND role = 'ADMIN' AND is_master = FALSE RETURNING id`,
            [JSON.stringify(permissions), is_active, id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Administrador no encontrado o es el maestro.' });
        res.json({ message: 'Permisos actualizados correctamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar permisos.' });
    }
};

export const createAdmin = async (req: AuthRequest, res: Response) => {
    const { full_name, email, password, permissions } = req.body;
    try {
        if (!req.user?.is_master) {
            return res.status(403).json({ error: 'No autorizado.' });
        }

        const bcrypt = require('bcrypt');
        const password_hash = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            `INSERT INTO users (full_name, email, password_hash, role, permissions, national_id, phone_number, date_of_birth) 
             VALUES ($1, $2, $3, 'ADMIN', $4, 'ADM-' || encode(gen_random_bytes(4), 'hex'), '506-' || encode(gen_random_bytes(4), 'hex'), '2000-01-01') 
             RETURNING id`,
            [full_name, email, password_hash, JSON.stringify(permissions)]
        );

        res.status(201).json({ message: 'Nuevo administrador creado exitosamente.', id: result.rows[0].id });
    } catch (error: any) {
        console.error('Error creating admin:', error);
        if (error.code === '23505') return res.status(409).json({ error: 'El correo electrónico ya está en uso.' });
        res.status(500).json({ error: 'Error interno al crear administrador.' });
    }
};

export const promoteToFranchise = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        if (!req.user?.is_master && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'No autorizado.' });
        }

        const result = await pool.query(
            `UPDATE users SET role = 'FRANCHISE', updated_at = NOW() WHERE id = $1 RETURNING id, full_name`,
            [id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'No se encontró el usuario.' });
        res.json({ message: `¡Usuario ${result.rows[0].full_name} ascendido a FRANQUICIA exitosamente!` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error del servidor al ascender usuario.' });
    }
};

export const getSystemSettings = async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(`SELECT * FROM system_settings`);
        const settings: Record<string, any> = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateSystemSettings = async (req: AuthRequest, res: Response) => {
    const { key, value } = req.body;
    try {
        if (req.user?.role !== 'ADMIN' && !req.user?.is_master) {
            return res.status(403).json({ error: 'Solo el administrador puede cambiar configuraciones globales.' });
        }
        
        await pool.query(
            `INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW())
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
            [key, JSON.stringify(value)]
        );
        res.json({ message: `Configuración '${key}' actualizada exitosamente.` });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getSalesReport = async (req: AuthRequest, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        let query = `
            SELECT b.lottery_type, SUM(b.total_amount) as total_sales, COUNT(*) as count 
            FROM bets b
            WHERE b.status != 'CANCELLED'
        `;
        const params: any[] = [];
        if (startDate) {
            params.push(startDate);
            query += ` AND b.created_at::date >= $${params.length}`;
        }
        if (endDate) {
            params.push(endDate);
            query += ` AND b.created_at::date <= $${params.length}`;
        }
        query += ` GROUP BY b.lottery_type ORDER BY b.lottery_type`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching sales report:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

