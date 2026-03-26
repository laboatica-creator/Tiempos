import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Configuración de la base de datos de Render
const renderPool = new Pool({
  connectionString: 'postgresql://tiempos_user:F7qM8btv5Xc2nRIix2MtUKBXreIfc9TE@dpg-d724fae3jp1c738p3o70-a.oregon-postgres.render.com/tiempos_n5xb',
  ssl: {
    rejectUnauthorized: false
  }
});

const ADMIN_EMAIL = 'laboatica@hotmail.com';
const ADMIN_PASSWORD = 'Les1419055@';

const createAdmin = async () => {
  console.log('🚀 Creando administrador en Render...');

  const client = await renderPool.connect();

  try {
    await client.query('BEGIN');

    // 1. Hashear contraseña
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    
    // 2. Insertar usuario administrador (sin is_master, usando role = 'ADMIN')
    const adminResult = await client.query(
      `INSERT INTO users (
        full_name, national_id, phone_number, email, date_of_birth, 
        password_hash, role, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (email) DO UPDATE SET 
        role = EXCLUDED.role,
        password_hash = EXCLUDED.password_hash,
        is_active = EXCLUDED.is_active
      RETURNING id`,
      [
        'Administrador Maestro',
        '111111111',
        '88888888',
        ADMIN_EMAIL,
        '1990-01-01',
        passwordHash,
        'ADMIN',
        true
      ]
    );
    
    const adminId = adminResult.rows[0].id;
    console.log(`✅ Administrador creado/actualizado (ID: ${adminId})`);

    // 3. Crear wallet para admin
    await client.query(
      `INSERT INTO wallets (user_id, balance) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id) DO NOTHING`,
      [adminId, 100000.00]
    );
    console.log('✅ Wallet del administrador creada');

    await client.query('COMMIT');
    console.log('\n🎉 Administrador creado exitosamente!');
    console.log('🔐 Email: laboatica@hotmail.com');
    console.log('🔐 Contraseña: Les1419055@');
    console.log('👑 Rol: ADMIN');
    
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    if (error.detail) console.error('Detalles:', error.detail);
  } finally {
    client.release();
    await renderPool.end();
  }
};

createAdmin();