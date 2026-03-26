import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://tiempos_user:tiempos_password@localhost:5432/tiempos_db',
  connectionTimeoutMillis: 5000,
  ssl: {
    rejectUnauthorized: false  // 🔥 Necesario para Render PostgreSQL
  }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});
