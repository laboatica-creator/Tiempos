const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
   try {
       await pool.query(`
           CREATE TABLE IF NOT EXISTS ocr_logs (
               id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
               user_id UUID NOT NULL REFERENCES users(id),
               image_url TEXT NOT NULL,
               extracted_text TEXT,
               amount DECIMAL(12, 2),
               reference_number VARCHAR(100),
               sender_name VARCHAR(100),
               date_extracted VARCHAR(100),
               status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED, REJECTED
               transaction_id UUID,
               created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
               updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
           );
       `);
       console.log('Tabla ocr_logs creada correctamente.');
   } catch(e) {
       console.error('Error creando tabla:', e.message);
   } finally {
       pool.end();
   }
})();
