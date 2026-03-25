const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
   try {
       const res = await pool.query('SELECT id, full_name, email, national_id, phone_number, role FROM users');
       console.log(res.rows);
   } catch(e) {
       console.error(e.message);
   } finally {
       pool.end();
   }
})();
