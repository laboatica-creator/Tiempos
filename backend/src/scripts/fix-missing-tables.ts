import { Pool } from 'pg';

const renderPool = new Pool({
  connectionString: 'postgresql://tiempos_user:F7qM8btv5Xc2nRIix2MtUKBXreIfc9TE@dpg-d724fae3jp1c738p3o70-a.oregon-postgres.render.com/tiempos_n5xb',
  ssl: { rejectUnauthorized: false }
});

const fixDatabase = async () => {
  console.log('🔧 Arreglando tablas faltantes...');
  
  const client = await renderPool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Agregar columna permissions
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'
    `);
    console.log('✅ Columna "permissions" agregada a users');
    
    // 2. Crear tabla winnings
    await client.query(`
      CREATE TABLE IF NOT EXISTS winnings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        bet_item_id UUID NOT NULL REFERENCES bet_items(id),
        user_id UUID NOT NULL REFERENCES users(id),
        draw_id UUID NOT NULL REFERENCES draws(id),
        amount DECIMAL(12, 2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla "winnings" creada');
    
    // 3. Crear índices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_winnings_user_id ON winnings(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_winnings_draw_id ON winnings(draw_id)
    `);
    console.log('✅ Índices creados');
    
    await client.query('COMMIT');
    console.log('\n🎉 Base de datos corregida exitosamente!');
    
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await renderPool.end();
  }
};

fixDatabase();