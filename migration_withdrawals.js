const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
   try {
       await pool.query(`
           CREATE TABLE IF NOT EXISTS withdrawal_requests (
               id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
               user_id UUID NOT NULL REFERENCES users(id),
               amount DECIMAL(12, 2) NOT NULL,
               method VARCHAR(50) NOT NULL,  -- SINPE, IBAN
               details TEXT,                 -- Numero IBAN, Nombre o detalle extra
               status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
               admin_notes TEXT,
               created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
               updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
           );
       `);
       console.log('Tabla withdrawal_requests creada correctamente.');
   } catch(e) {
       console.error('Error creando tabla:', e.message);
   } finally {
       pool.end();
   }
})();
