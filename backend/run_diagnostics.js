require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("=== DIAGNÓSTICO NICA 12:00 PM ===");
    
    let res = await pool.query(`SELECT * FROM draws WHERE lottery_type = 'NICA' AND draw_time = '12:00:00' ORDER BY draw_date DESC LIMIT 10`);
    console.log("1. NICA 12:00PM Recent:", res.rows);

    res = await pool.query(`SELECT DISTINCT draw_time, draw_date FROM draws WHERE lottery_type = 'NICA' ORDER BY draw_date DESC, draw_time ASC LIMIT 10`);
    console.log("2. All NICA distinct combos (limit 10):", res.rows);

    res = await pool.query(`SELECT * FROM draws WHERE lottery_type = 'NICA' AND draw_date = CURRENT_DATE`);
    console.log("3. Today's NICA draws:", res.rows);

    console.log("\n=== DIAGNÓSTICO DE REPORTES ===");
    
    // Check bets
    try {
        res = await pool.query(`SELECT COUNT(*) as total_apuestas, SUM(total_amount) as monto_total FROM bets WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)`);
        console.log("Bets:", res.rows[0]);
    } catch(e) { console.log("Bets error:", e.message) }

    // Check users
    try {
        res = await pool.query(`SELECT role, COUNT(*) FROM users GROUP BY role`);
        console.log("Users:", res.rows);
    } catch(e) { console.log("Users error:", e.message) }
    
    // Check SINPE
    try {
        res = await pool.query(`SELECT COUNT(*) as total_recargas, SUM(amount) as monto_total FROM sinpe_deposits WHERE status = 'COMPLETED' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`);
        console.log("SINPE Depositos:", res.rows[0]);
    } catch(e) { console.log("SINPE error:", e.message) }

    // Check Withdrawals
    try {
        res = await pool.query(`SELECT COUNT(*) as total_retiros, SUM(amount) as monto_total FROM withdrawals WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)`);
        console.log("Retiros:", res.rows[0]);
    } catch(e) { console.log("Withdrawals error:", e.message) }

    // Check Winnings
    try {
        res = await pool.query(`SELECT COUNT(*) as total_premios, SUM(amount) as monto_total FROM winnings WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)`);
        console.log("Premios:", res.rows[0]);
    } catch(e) { console.log("Winnings error:", e.message) }

  } catch (error) {
    console.error("DIAGNOSTIC ERROR", error);
  } finally {
    pool.end();
  }
}

run();
