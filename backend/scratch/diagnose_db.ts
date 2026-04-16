import { pool } from '../src/index';

async function diagnose() {
    try {
        console.log('--- DIAGNÓSTICO DE BASE DE DATOS TIEMPOS PRO ---');
        
        // 1. Verificar columnas de la tabla 'bets'
        const columns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'bets'
        `);
        console.log('Columnas en tabla BETS:', columns.rows.map(c => `${c.column_name} (${c.data_type})` || 'N/A'));

        // 2. Buscar apuestas de Carla
        const carla = await pool.query(`
            SELECT b.id, b.total_amount, b.created_at, b.seller_id
            FROM bets b
            JOIN users u ON b.seller_id = u.id
            WHERE u.email = 'carla@vendedor.com'
            ORDER BY b.created_at DESC LIMIT 5
        `);
        console.log('Apuestas encontradas para Carla:', carla.rows);

        // 3. Verificar si hay items
        if (carla.rows.length > 0) {
            const items = await pool.query(`SELECT * FROM bet_items WHERE bet_id = $1`, [carla.rows[0].id]);
            console.log('Detalle de la última apuesta de Carla:', items.rows);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error en diagnóstico:', error);
        process.exit(1);
    }
}

diagnose();
