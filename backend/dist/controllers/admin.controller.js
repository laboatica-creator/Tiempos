"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFranchise = exports.getAllFranchises = exports.getRiskExposure = exports.deletePlayer = exports.updatePlayer = exports.getAllPlayers = exports.getRecentTransactions = exports.getDashboardStats = void 0;
const index_1 = require("../index");
const getDashboardStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const role = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
        const today = new Date().toISOString().split('T')[0];
        let salesQuery = `SELECT SUM(total_amount) as total FROM bets WHERE created_at::date = $1`;
        let winQuery = `SELECT SUM(amount) as total FROM winnings WHERE created_at::date = $1`;
        let userQuery = `SELECT COUNT(*) as total FROM users WHERE role = 'CUSTOMER'`;
        let sinpeQuery = `SELECT COUNT(*) as total FROM sinpe_deposits WHERE status = 'PENDING'`;
        const queryParams = [today];
        const noParamQuery = [];
        if (role === 'FRANCHISE') {
            salesQuery = `SELECT SUM(b.total_amount) as total FROM bets b JOIN users u ON b.user_id = u.id WHERE b.created_at::date = $1 AND u.franchise_id = $2`;
            winQuery = `SELECT SUM(w.amount) as total FROM winnings w JOIN users u ON w.user_id = u.id WHERE w.created_at::date = $1 AND u.franchise_id = $2`;
            userQuery = `SELECT COUNT(*) as total FROM users WHERE role = 'CUSTOMER' AND franchise_id = $1`;
            sinpeQuery = `SELECT COUNT(*) as total FROM sinpe_deposits sd JOIN users u ON sd.user_id = u.id WHERE sd.status = 'PENDING' AND u.franchise_id = $1`;
            queryParams.push(userId);
            noParamQuery.push(userId);
        }
        const salesRes = yield index_1.pool.query(salesQuery, queryParams);
        const winningsRes = yield index_1.pool.query(winQuery, queryParams);
        const usersRes = yield index_1.pool.query(userQuery, noParamQuery);
        const pendingSinpe = yield index_1.pool.query(sinpeQuery, noParamQuery);
        res.json({
            todaySales: salesRes.rows[0].total || 0,
            todayWinnings: winningsRes.rows[0].total || 0,
            totalUsers: usersRes.rows[0].total || 0,
            pendingSinpe: pendingSinpe.rows[0].total || 0
        });
    }
    catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getDashboardStats = getDashboardStats;
const getRecentTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const role = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
        let query = `
             SELECT wt.*, u.full_name as user_name 
             FROM wallet_transactions wt
             JOIN wallets w ON wt.wallet_id = w.id
             JOIN users u ON w.user_id = u.id
             ${role === 'FRANCHISE' ? 'WHERE u.franchise_id = $1' : ''}
             ORDER BY wt.created_at DESC LIMIT 10`;
        const queryParams = role === 'FRANCHISE' ? [userId] : [];
        const result = yield index_1.pool.query(query, queryParams);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching recent transactions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getRecentTransactions = getRecentTransactions;
const getAllPlayers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const role = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
        let query = `
             SELECT u.id, u.full_name, u.national_id, u.phone_number, u.is_active, u.created_at, w.balance 
             FROM users u
             LEFT JOIN wallets w ON u.id = w.user_id
             WHERE u.role = 'CUSTOMER' ${role === 'FRANCHISE' ? 'AND u.franchise_id = $1' : ''}
             ORDER BY u.created_at DESC`;
        const queryParams = role === 'FRANCHISE' ? [userId] : [];
        const result = yield index_1.pool.query(query, queryParams);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching players:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getAllPlayers = getAllPlayers;
const updatePlayer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { full_name, email, is_active } = req.body;
    try {
        const result = yield index_1.pool.query(`UPDATE users SET full_name = $1, email = $2, is_active = $3, updated_at = NOW() WHERE id = $4 AND role = 'CUSTOMER' RETURNING *`, [full_name, email, is_active, id]);
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Player not found' });
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating player:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.updatePlayer = updatePlayer;
const deletePlayer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const result = yield index_1.pool.query(`DELETE FROM users WHERE id = $1 AND role = 'CUSTOMER' RETURNING id`, [id]);
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Player not found' });
        res.json({ message: 'Player deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting player:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.deletePlayer = deletePlayer;
const getRiskExposure = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { lotteryType } = req.params;
    try {
        // Find the most recent OPEN draw for this lottery type
        const drawRes = yield index_1.pool.query(`SELECT id FROM draws WHERE lottery_type = $1 AND status IN ('OPEN', 'CLOSED') ORDER BY draw_date ASC, draw_time ASC LIMIT 1`, [lotteryType]);
        if (drawRes.rows.length === 0) {
            return res.json({ exposure: {} });
        }
        const drawId = drawRes.rows[0].id;
        const exposureRes = yield index_1.pool.query(`SELECT number, SUM(amount) as total_amount 
             FROM bet_items bi
             JOIN bets b ON bi.bet_id = b.id
             WHERE b.draw_id = $1
             GROUP BY number`, [drawId]);
        const exposureMap = {};
        exposureRes.rows.forEach(row => {
            exposureMap[row.number] = parseFloat(row.total_amount);
        });
        res.json({ drawId, exposure: exposureMap });
    }
    catch (error) {
        console.error('Error fetching risk exposure:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getRiskExposure = getRiskExposure;
const getAllFranchises = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield index_1.pool.query(`SELECT u.id, u.full_name, u.national_id, u.phone_number, u.email, u.is_active, u.created_at,
                    w.balance,
                    COUNT(p.id) as player_count
             FROM users u
             LEFT JOIN wallets w ON u.id = w.user_id
             LEFT JOIN users p ON p.franchise_id = u.id AND p.role = 'CUSTOMER'
             WHERE u.role = 'FRANCHISE'
             GROUP BY u.id, u.full_name, u.national_id, u.phone_number, u.email, u.is_active, u.created_at, w.balance
             ORDER BY u.created_at DESC`);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching franchises:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getAllFranchises = getAllFranchises;
const deleteFranchise = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        // Unlink players from this franchise before deleting
        yield index_1.pool.query(`UPDATE users SET franchise_id = NULL WHERE franchise_id = $1`, [id]);
        const result = yield index_1.pool.query(`DELETE FROM users WHERE id = $1 AND role = 'FRANCHISE' RETURNING id`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Franquicia no encontrada.' });
        }
        res.json({ message: 'Franquicia eliminada exitosamente.' });
    }
    catch (error) {
        console.error('Error deleting franchise:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.deleteFranchise = deleteFranchise;
