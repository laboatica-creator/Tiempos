"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const renderPool = new pg_1.Pool({
    connectionString: 'postgresql://tiempos_user:F7qM8btv5Xc2nRIix2MtUKBXreIfc9TE@dpg-d724fae3jp1c738p3o70-a.oregon-postgres.render.com/tiempos_n5xb',
    ssl: { rejectUnauthorized: false }
});
const fixAllMissing = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('🔧 Arreglando todas las tablas y columnas faltantes...');
    const client = yield renderPool.connect();
    try {
        yield client.query('BEGIN');
        // 1. Agregar columna is_master a users (si no existe)
        yield client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT FALSE
    `);
        console.log('✅ Columna "is_master" agregada a users');
        // 2. Agregar columna permissions (por si no estaba)
        yield client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'
    `);
        console.log('✅ Columna "permissions" agregada a users');
        // 3. Crear tabla sinpe_deposits
        yield client.query(`
      CREATE TABLE IF NOT EXISTS sinpe_deposits (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        amount DECIMAL(12, 2) NOT NULL,
        reference_number VARCHAR(100) UNIQUE NOT NULL,
        sender_name VARCHAR(255) NULL,
        method_type VARCHAR(20) DEFAULT 'SINPE',
        receipt_hash VARCHAR(64) UNIQUE NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        approved_by UUID NULL REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
        console.log('✅ Tabla "sinpe_deposits" creada');
        // 4. Crear tabla winnings (si no existe)
        yield client.query(`
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
        // 5. Crear índices para sinpe_deposits
        yield client.query(`
      CREATE INDEX IF NOT EXISTS idx_sinpe_deposits_user_id ON sinpe_deposits(user_id)
    `);
        yield client.query(`
      CREATE INDEX IF NOT EXISTS idx_sinpe_deposits_status ON sinpe_deposits(status)
    `);
        console.log('✅ Índices para sinpe_deposits creados');
        // 6. Crear índices para winnings
        yield client.query(`
      CREATE INDEX IF NOT EXISTS idx_winnings_user_id ON winnings(user_id)
    `);
        yield client.query(`
      CREATE INDEX IF NOT EXISTS idx_winnings_draw_id ON winnings(draw_id)
    `);
        console.log('✅ Índices para winnings creados');
        // 7. Marcar al administrador como is_master = TRUE
        yield client.query(`
      UPDATE users 
      SET is_master = TRUE, 
          permissions = '["manage_users","manage_draws","manage_bets","manage_wallets","manage_deposits","manage_withdrawals","view_reports","manage_admins","system_settings"]'::jsonb
      WHERE email = 'laboatica@hotmail.com'
    `);
        console.log('✅ Administrador marcado como is_master y con permisos completos');
        yield client.query('COMMIT');
        console.log('\n🎉 Todas las correcciones aplicadas exitosamente!');
    }
    catch (error) {
        yield client.query('ROLLBACK');
        console.error('❌ Error:', error.message);
    }
    finally {
        client.release();
        yield renderPool.end();
    }
});
fixAllMissing();
