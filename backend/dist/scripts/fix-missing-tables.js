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
const fixDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('🔧 Arreglando tablas faltantes...');
    const client = yield renderPool.connect();
    try {
        yield client.query('BEGIN');
        // 1. Agregar columna permissions
        yield client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'
    `);
        console.log('✅ Columna "permissions" agregada a users');
        // 2. Crear tabla winnings
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
        // 3. Crear índices
        yield client.query(`
      CREATE INDEX IF NOT EXISTS idx_winnings_user_id ON winnings(user_id)
    `);
        yield client.query(`
      CREATE INDEX IF NOT EXISTS idx_winnings_draw_id ON winnings(draw_id)
    `);
        console.log('✅ Índices creados');
        yield client.query('COMMIT');
        console.log('\n🎉 Base de datos corregida exitosamente!');
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
fixDatabase();
