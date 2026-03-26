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
// Load environment variables from .env
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
// Configuración de la base de datos con SSL para Render
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // 🔥 Necesario para Render PostgreSQL
    }
});
const createAdmin = () => __awaiter(void 0, void 0, void 0, function* () {
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
    const client = yield pool.connect();
    try {
        yield client.query('BEGIN');
        // 1. Hash the password
        const saltRounds = 10;
        const password_hash = yield bcrypt_1.default.hash(adminData.password, saltRounds);
        console.log('✅ Password hashed successfully');
        // 2. Insert into users table
        const userResult = yield client.query(`INSERT INTO users (
                full_name, national_id, phone_number, email, 
                date_of_birth, password_hash, role
            ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
            ON CONFLICT (email) DO UPDATE SET 
                role = EXCLUDED.role,
                password_hash = EXCLUDED.password_hash
            RETURNING id`, [
            adminData.full_name,
            adminData.national_id,
            adminData.phone_number,
            adminData.email,
            adminData.date_of_birth,
            password_hash,
            adminData.role
        ]);
        const userId = userResult.rows[0].id;
        console.log(`✅ User ensured in DB (ID: ${userId})`);
        // 3. Ensure wallet exists for the user
        yield client.query(`INSERT INTO wallets (user_id, balance) 
             VALUES ($1, $2) 
             ON CONFLICT (user_id) DO NOTHING`, [userId, 0.00]);
        console.log('✅ Wallet ensured for user');
        yield client.query('COMMIT');
        console.log('🎉 Admin creation script finished successfully!');
    }
    catch (error) {
        yield client.query('ROLLBACK');
        console.error('❌ Error creating admin user:', error.message);
        if (error.detail)
            console.error('Details:', error.detail);
    }
    finally {
        client.release();
        process.exit();
    }
});
createAdmin();
