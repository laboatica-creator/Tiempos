const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkAdmin() {
    try {
        const res = await pool.query("SELECT email, is_master, role FROM users WHERE email = 'laboatica@hotmail.com'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
checkAdmin();
