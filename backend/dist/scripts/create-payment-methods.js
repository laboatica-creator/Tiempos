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
const createPaymentMethods = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('🔧 Creando tabla payment_methods...');
    const client = yield renderPool.connect();
    try {
        // Crear tabla payment_methods
        yield client.query(`
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
        yield client.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id)
    `);
        console.log('✅ Índice creado');
        console.log('\n🎉 Tabla payment_methods lista!');
    }
    catch (error) {
        console.error('❌ Error:', error.message);
    }
    finally {
        client.release();
        yield renderPool.end();
    }
});
createPaymentMethods();
