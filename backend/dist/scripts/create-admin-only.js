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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const bcrypt_1 = __importDefault(require("bcrypt"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
// Configuración de la base de datos de Render
const renderPool = new pg_1.Pool({
    connectionString: 'postgresql://tiempos_user:F7qM8btv5Xc2nRIix2MtUKBXreIfc9TE@dpg-d724fae3jp1c738p3o70-a.oregon-postgres.render.com/tiempos_n5xb',
    ssl: {
        rejectUnauthorized: false
    }
});
const ADMIN_EMAIL = 'laboatica@hotmail.com';
const ADMIN_PASSWORD = 'Les1419055@';
const createAdmin = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('🚀 Creando administrador en Render...');
    const client = yield renderPool.connect();
    try {
        yield client.query('BEGIN');
        // 1. Hashear contraseña
        const passwordHash = yield bcrypt_1.default.hash(ADMIN_PASSWORD, 10);
        // 2. Insertar usuario administrador (sin is_master, usando role = 'ADMIN')
        const adminResult = yield client.query(`INSERT INTO users (
        full_name, national_id, phone_number, email, date_of_birth, 
        password_hash, role, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (email) DO UPDATE SET 
        role = EXCLUDED.role,
        password_hash = EXCLUDED.password_hash,
        is_active = EXCLUDED.is_active
      RETURNING id`, [
            'Administrador Maestro',
            '111111111',
            '88888888',
            ADMIN_EMAIL,
            '1990-01-01',
            passwordHash,
            'ADMIN',
            true
        ]);
        const adminId = adminResult.rows[0].id;
        console.log(`✅ Administrador creado/actualizado (ID: ${adminId})`);
        // 3. Crear wallet para admin
        yield client.query(`INSERT INTO wallets (user_id, balance) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id) DO NOTHING`, [adminId, 100000.00]);
        console.log('✅ Wallet del administrador creada');
        yield client.query('COMMIT');
        console.log('\n🎉 Administrador creado exitosamente!');
        console.log('🔐 Email: laboatica@hotmail.com');
        console.log('🔐 Contraseña: Les1419055@');
        console.log('👑 Rol: ADMIN');
    }
    catch (error) {
        yield client.query('ROLLBACK');
        console.error('❌ Error:', error.message);
        if (error.detail)
            console.error('Detalles:', error.detail);
    }
    finally {
        client.release();
        yield renderPool.end();
    }
});
createAdmin();
