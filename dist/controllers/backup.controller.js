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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importDatabase = exports.exportDatabase = void 0;
const index_1 = require("../index");
const bcrypt_1 = __importDefault(require("bcrypt"));
const exportDatabase = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: 'La contraseña del administrador es requerida.' });
        }
        const userRes = yield index_1.pool.query('SELECT password_hash FROM users WHERE id = $1', [(_a = req.user) === null || _a === void 0 ? void 0 : _a.id]);
        if (userRes.rows.length === 0)
            return res.status(401).json({ error: 'Usuario no autenticado validamente.' });
        const isValid = yield bcrypt_1.default.compare(password, userRes.rows[0].password_hash);
        if (!isValid)
            return res.status(401).json({ error: 'Contraseña incorrecta. Acceso denegado.' });
        const client = yield index_1.pool.connect();
        try {
            const tables = [
                'users', 'wallets', 'draws', 'draw_exposure',
                'bets', 'bet_items', 'winnings',
                'wallet_transactions', 'sinpe_deposits', 'admin_logs'
            ];
            const backup = {};
            for (const table of tables) {
                const result = yield client.query(`SELECT * FROM ${table}`);
                backup[table] = result.rows;
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `backup_tiempos_${timestamp}.json`;
            res.setHeader('Content-disposition', `attachment; filename=${filename}`);
            res.setHeader('Content-type', 'application/json');
            res.status(200).send(JSON.stringify(backup, null, 2));
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Error al exportar base de datos:', error);
        res.status(500).json({ error: 'Fallo al generar el respaldo de la base de datos.' });
    }
});
exports.exportDatabase = exportDatabase;
const importDatabase = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { password, data: backup } = req.body;
    if (!password) {
        return res.status(400).json({ error: 'La contraseña del administrador es requerida.' });
    }
    const userRes = yield index_1.pool.query('SELECT password_hash FROM users WHERE id = $1', [(_a = req.user) === null || _a === void 0 ? void 0 : _a.id]);
    if (userRes.rows.length === 0)
        return res.status(401).json({ error: 'Usuario no autenticado validamente.' });
    const isValid = yield bcrypt_1.default.compare(password, userRes.rows[0].password_hash);
    if (!isValid)
        return res.status(401).json({ error: 'Contraseña incorrecta. Acceso denegado al sistema de restauración.' });
    if (!backup || typeof backup !== 'object') {
        return res.status(400).json({ error: 'El archivo de respaldo es inválido.' });
    }
    const requiredTables = [
        'users', 'wallets', 'draws', 'draw_exposure',
        'bets', 'bet_items', 'winnings',
        'wallet_transactions', 'sinpe_deposits', 'admin_logs'
    ];
    for (const table of requiredTables) {
        if (!backup[table]) {
            return res.status(400).json({ error: `El respaldo carece de la tabla: ${table}` });
        }
    }
    const client = yield index_1.pool.connect();
    try {
        yield client.query('BEGIN');
        // 1. Desactivar triggers y constraints temporalmente para evitar problemas de dependencias circulares
        yield client.query("SET session_replication_role = 'replica'");
        // 2. Limpiar la base de datos completa con CASCADE 
        yield client.query('TRUNCATE TABLE winnings, bet_items, bets, draw_exposure, sinpe_deposits, wallet_transactions, admin_logs, draws, wallets, users CASCADE');
        // 2. Insertar en orden estricto para mantener la integridad relacional
        const insertionOrder = [
            'users',
            'wallets',
            'draws',
            'draw_exposure',
            'bets',
            'bet_items',
            'winnings',
            'wallet_transactions',
            'sinpe_deposits',
            'admin_logs'
        ];
        for (const table of insertionOrder) {
            const rows = backup[table];
            if (rows && rows.length > 0) {
                const columns = Object.keys(rows[0]);
                // Procesar las filas en lotes o una por una (aquí una por una para evitar superar el límite de parámetros de consulta de postgres que es 65535, aunque se podrían agrupar)
                for (const row of rows) {
                    const values = columns.map(col => row[col]);
                    const placeHolders = columns.map((_, i) => `$${i + 1}`).join(', ');
                    const colNames = columns.join(', ');
                    const query = `INSERT INTO ${table} (${colNames}) VALUES (${placeHolders})`;
                    yield client.query(query, values);
                }
            }
        }
        yield client.query("SET session_replication_role = 'origin'");
        yield client.query('COMMIT');
        res.status(200).json({ message: 'Base de datos restaurada correctamente.' });
    }
    catch (error) {
        yield client.query('ROLLBACK');
        console.error('Error restaurando la base de datos:', error);
        res.status(500).json({ error: 'Error interno reconstruyendo la base de datos: ' + error.message });
    }
    finally {
        client.release();
    }
});
exports.importDatabase = importDatabase;
