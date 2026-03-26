const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runFix() {
  console.log('🚀 Iniciando parche de base de datos...');
  const client = await pool.connect();
  try {
    console.log('📦 Verificando columnas en sinpe_deposits...');
    await client.query(`ALTER TABLE sinpe_deposits ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) NULL`);
    await client.query(`ALTER TABLE sinpe_deposits ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE NULL`);
    
    console.log('📦 Verificando tabla withdrawal_requests...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        amount DECIMAL(15, 2) NOT NULL,
        method VARCHAR(20) NOT NULL,
        details TEXT,
        status VARCHAR(20) DEFAULT 'PENDING',
        processed_at TIMESTAMP WITH TIME ZONE NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    console.log('✅ Base de datos actualizada correctamente.');
  } catch (err) {
    console.error('❌ Error actualizando base de datos:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runFix();
