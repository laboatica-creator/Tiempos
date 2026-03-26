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
/**
 * Migration and Setup Script
 * Created to:
 * 1. Ensure the Master Admin exists on Render.
 * 2. Migrate existing players from local DB or files to Render.
 * 3. Ensure everyone has a wallet.
 */
const performMigration = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // 1. URLs Configuration
    const renderUrl = process.env.RENDER_DATABASE_URL || process.env.DATABASE_URL;
    const localUrl = process.env.LOCAL_DATABASE_URL || 'postgres://tiempos_user:tiempos_password@localhost:5433/tiempos_db';
    if (!renderUrl || renderUrl.includes('localhost')) {
        console.error('❌ ERROR: RENDER_DATABASE_URL is not provided or points to localhost. Please set it in .env or as an environment variable.');
        process.exit(1);
    }
    console.log(`🚀 [Migration] Target: ${renderUrl.split('@')[1] || 'Render'}`);
    console.log(`🏠 [Migration] Source: ${localUrl.split('@')[1] || 'Local DB'}`);
    const renderPool = new pg_1.Pool({ connectionString: renderUrl, ssl: { rejectUnauthorized: false } });
    const localPool = new pg_1.Pool({ connectionString: localUrl });
    let summary = {
        adminCreated: false,
        playersMigrated: 0,
        walletsCreated: 0,
        errors: []
    };
    try {
        // --- STEP 1: Create Master Admin ---
        console.log('\n--- STEP 1: Master Admin Setup ---');
        const adminData = {
            email: 'laboatica@hotmail.com',
            password: 'Les1419055@',
            full_name: 'Administrador Maestro',
            role: 'ADMIN'
        };
        const hashedPassword = yield bcrypt_1.default.hash(adminData.password, 10);
        const adminResult = yield renderPool.query(`
            INSERT INTO users (full_name, national_id, phone_number, email, date_of_birth, password_hash, role, is_master, is_active)
            VALUES ($1, '000000000', '+50600000000', $2, '1990-01-01', $3, 'ADMIN', TRUE, TRUE)
            ON CONFLICT (email) DO UPDATE SET 
                role = 'ADMIN',
                is_master = TRUE,
                password_hash = EXCLUDED.password_hash,
                full_name = EXCLUDED.full_name
            RETURNING id
        `, [adminData.full_name, adminData.email, hashedPassword]);
        const adminId = adminResult.rows[0].id;
        summary.adminCreated = true;
        console.log(`✅ Master Admin ensured (ID: ${adminId})`);
        // Ensure wallet for admin
        yield renderPool.query(`
            INSERT INTO wallets (user_id, balance) VALUES ($1, 0.00) ON CONFLICT (user_id) DO NOTHING
        `, [adminId]);
        summary.walletsCreated++;
        // --- STEP 2: Migrate Players from Local DB ---
        console.log('\n--- STEP 2: Migrating Local Players ---');
        try {
            const localUsers = yield localPool.query(`
                SELECT * FROM users WHERE role != 'ADMIN'
            `);
            console.log(`🔍 Found ${localUsers.rows.length} players locally.`);
            for (const user of localUsers.rows) {
                try {
                    // Fetch local wallet balance
                    const localWallet = yield localPool.query(`SELECT balance FROM wallets WHERE user_id = $1`, [user.id]);
                    const balance = ((_a = localWallet.rows[0]) === null || _a === void 0 ? void 0 : _a.balance) || 0.00;
                    // Insert into Render
                    const migrateRes = yield renderPool.query(`
                        INSERT INTO users (full_name, national_id, phone_number, email, date_of_birth, password_hash, role, is_active, franchise_id)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        ON CONFLICT (email) DO NOTHING
                        RETURNING id
                    `, [user.full_name, user.national_id, user.phone_number, user.email, user.date_of_birth, user.password_hash, user.role, user.is_active, user.franchise_id]);
                    if (migrateRes.rows.length > 0) {
                        const newUserId = migrateRes.rows[0].id;
                        // Create Wallet on Render
                        yield renderPool.query(`
                            INSERT INTO wallets (user_id, balance) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING
                        `, [newUserId, balance]);
                        summary.playersMigrated++;
                        summary.walletsCreated++;
                        console.log(`✅ Player migrated: ${user.email}`);
                    }
                    else {
                        console.log(`⚠️ Player already exists on Render (skipped): ${user.email}`);
                    }
                }
                catch (userErr) {
                    summary.errors.push(`Error with user ${user.email}: ${userErr.message}`);
                }
            }
        }
        catch (dbErr) {
            console.warn(`⚠️ Local DB connection failed or table does not exist: ${dbErr.message}`);
            summary.errors.push('Local DB migration skipped');
        }
        // --- STEP 3: Final Report ---
        console.log('\n======================================');
        console.log('🏁 MIGRATION SUMMARY');
        console.log(`⭐ Admin Created/Updated: ${summary.adminCreated ? 'YES' : 'NO'}`);
        console.log(`👤 Players Migrated: ${summary.playersMigrated}`);
        console.log(`💰 Wallets Ensured: ${summary.walletsCreated}`);
        if (summary.errors.length > 0) {
            console.log('❌ Errors encountered during process:');
            summary.errors.forEach(e => console.log(`  - ${e}`));
        }
        console.log('======================================');
    }
    catch (error) {
        console.error('\n❌ CRITICAL ERROR during migration:', error.message);
    }
    finally {
        yield renderPool.end();
        yield localPool.end();
        process.exit();
    }
});
performMigration();
