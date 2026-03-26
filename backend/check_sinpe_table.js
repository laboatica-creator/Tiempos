const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkTable() {
    try {
        const res = await pool.query("SELECT * FROM information_schema.columns WHERE table_name = 'sinpe_deposits'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
checkTable();
