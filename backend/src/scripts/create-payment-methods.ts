import { Pool } from 'pg';

const renderPool = new Pool({
  connectionString: 'postgresql://tiempos_user:F7qM8btv5Xc2nRIix2MtUKBXreIfc9TE@dpg-d724fae3jp1c738p3o70-a.oregon-postgres.render.com/tiempos_n5xb',
  ssl: { rejectUnauthorized: false }
});

const createPaymentMethods = async () => {
  console.log('🔧 Creando tabla payment_methods...');
  
  const client = await renderPool.connect();
  
  try {
    // Crear tabla payment_methods
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        last4 VARCHAR(4) NOT NULL,
        expiry_date VARCHAR(10) NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla "payment_methods" creada');
    
    // Crear índice
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id)
    `);
    console.log('✅ Índice creado');
    
    console.log('\n🎉 Tabla payment_methods lista!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await renderPool.end();
  }
};

createPaymentMethods();