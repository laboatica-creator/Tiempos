import { Request, Response } from 'express';
import { pool } from '../index';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../middlewares/auth.middleware';

export const exportDatabase = async (req: AuthRequest, res: Response) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: 'La contraseña del administrador es requerida.' });
        }

        const userRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user?.id]);
        if (userRes.rows.length === 0) return res.status(401).json({ error: 'Usuario no autenticado validamente.' });

        const isValid = await bcrypt.compare(password, userRes.rows[0].password_hash);
        if (!isValid) return res.status(401).json({ error: 'Contraseña incorrecta. Acceso denegado.' });

        const client = await pool.connect();
        try {
            const tables = [
                'users', 'wallets', 'draws', 'draw_exposure', 
                'bets', 'bet_items', 'winnings', 
                'wallet_transactions', 'sinpe_deposits', 'admin_logs'
            ];
            
            const backup: any = {};
            
            for (const table of tables) {
                const result = await client.query(`SELECT * FROM ${table}`);
                backup[table] = result.rows;
            }
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `backup_tiempos_${timestamp}.json`;
            
            res.setHeader('Content-disposition', `attachment; filename=${filename}`);
            res.setHeader('Content-type', 'application/json');
            res.status(200).send(JSON.stringify(backup, null, 2));

        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error al exportar base de datos:', error);
        res.status(500).json({ error: 'Fallo al generar el respaldo de la base de datos.' });
    }
};

export const importDatabase = async (req: AuthRequest, res: Response) => {
    const { password, data: backup } = req.body;
    
    if (!password) {
        return res.status(400).json({ error: 'La contraseña del administrador es requerida.' });
    }

    const userRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user?.id]);
    if (userRes.rows.length === 0) return res.status(401).json({ error: 'Usuario no autenticado validamente.' });

    const isValid = await bcrypt.compare(password, userRes.rows[0].password_hash);
    if (!isValid) return res.status(401).json({ error: 'Contraseña incorrecta. Acceso denegado al sistema de restauración.' });

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

    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // 1. Desactivar triggers y constraints temporalmente para evitar problemas de dependencias circulares
        await client.query("SET session_replication_role = 'replica'");

        // 2. Limpiar la base de datos completa con CASCADE 
        await client.query('TRUNCATE TABLE winnings, bet_items, bets, draw_exposure, sinpe_deposits, wallet_transactions, admin_logs, draws, wallets, users CASCADE');

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
                    await client.query(query, values);
                }
            }
        }

        await client.query("SET session_replication_role = 'origin'");
        await client.query('COMMIT');
        res.status(200).json({ message: 'Base de datos restaurada correctamente.' });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error restaurando la base de datos:', error);
        res.status(500).json({ error: 'Error interno reconstruyendo la base de datos: ' + error.message });
    } finally {
        client.release();
    }
};
