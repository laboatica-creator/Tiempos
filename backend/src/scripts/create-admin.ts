import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Configuración de la base de datos con SSL para Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false  // 🔥 Necesario para Render PostgreSQL
  }
});

const createAdmin = async () => {
    const adminData = {
        full_name: 'Administrador',
        national_id: '111111111',
        phone_number: '88888888',
        email: 'laboatica@hotmail.com',
        date_of_birth: '1990-01-01',
        password: 'Les1419055@',
        role: 'ADMIN'
    };

    console.log(`🚀 [Admin Creation] Creating admin user: ${adminData.email}`);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Hash the password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(adminData.password, saltRounds);
        console.log('✅ Password hashed successfully');

        // 2. Insert into users table
        const userResult = await client.query(
            `INSERT INTO users (
                full_name, national_id, phone_number, email, 
                date_of_birth, password_hash, role
            ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
            ON CONFLICT (email) DO UPDATE SET 
                role = EXCLUDED.role,
                password_hash = EXCLUDED.password_hash
            RETURNING id`,
            [
                adminData.full_name, 
                adminData.national_id, 
                adminData.phone_number, 
                adminData.email, 
                adminData.date_of_birth, 
                password_hash, 
                adminData.role
            ]
        );

        const userId = userResult.rows[0].id;
        console.log(`✅ User ensured in DB (ID: ${userId})`);

        // 3. Ensure wallet exists for the user
        await client.query(
            `INSERT INTO wallets (user_id, balance) 
             VALUES ($1, $2) 
             ON CONFLICT (user_id) DO NOTHING`,
            [userId, 0.00]
        );
        console.log('✅ Wallet ensured for user');

        await client.query('COMMIT');
        console.log('🎉 Admin creation script finished successfully!');
        
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('❌ Error creating admin user:', error.message);
        if (error.detail) console.error('Details:', error.detail);
    } finally {
        client.release();
        process.exit();
    }
};

createAdmin();