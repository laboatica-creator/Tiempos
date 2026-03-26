const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://tiempos_user:F7qM8btv5Xc2nRIix2MtUKBXreIfc9TE@dpg-d724fae3jp1c738p3o70-a.oregon-postgres.render.com/tiempos_n5xb',
  ssl: { rejectUnauthorized: false }
});

async function runPatch() {
  console.log('🔧 Ejecutando parche de base de datos...');
  
  const client = await pool.connect();
  
  try {
    // Agregar columna processed_at a sinpe_deposits
    await client.query(`
      ALTER TABLE sinpe_deposits 
      ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE
    `);
    console.log('✅ Columna processed_at agregada a sinpe_deposits');
    
    // Verificar otras columnas necesarias
    const tables = ['withdrawal_requests', 'winnings', 'commissions'];
    for (const table of tables) {
      const result = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'processed_at'
      `, [table]);
      
      if (result.rows.length === 0) {
        await client.query(`
          ALTER TABLE ${table} 
          ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE
        `);
        console.log(`✅ Columna processed_at agregada a ${table}`);
      }
    }
    
    console.log('🎉 Parche completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error en parche:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runPatch();