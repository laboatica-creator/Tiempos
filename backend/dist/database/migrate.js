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
exports.runMigrations = void 0;
const db_1 = require("./db");
/**
 * Executes comprehensive database migrations to ensure a 100% functional schema.
 */
const runMigrations = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('🔄 [Migration] Starting comprehensive system migration...');
    const client = yield db_1.pool.connect();
    try {
        yield client.query('BEGIN');
        // 1. Ensure Extensions
        yield client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        yield client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
        // 2. Enum Types
        const types = [
            { name: 'user_role', values: ["'CUSTOMER'", "'AGENT'", "'FRANCHISE'", "'ADMIN'"] },
            { name: 'lottery_type', values: ["'TICA'", "'NICA'"] },
            { name: 'draw_status', values: ["'OPEN'", "'CLOSED'", "'FINISHED'", "'CANCELLED'"] },
            { name: 'tx_type', values: ["'DEPOSIT'", "'BET'", "'WIN'", "'WITHDRAW'", "'COMMISSION'", "'REFUND'"] }
        ];
        for (const type of types) {
            const checkType = yield client.query(`SELECT 1 FROM pg_type WHERE typname = '${type.name}'`);
            if (checkType.rowCount === 0) {
                yield client.query(`CREATE TYPE ${type.name} AS ENUM (${type.values.join(', ')})`);
                console.log(`✅ [Migration] Type ${type.name} created`);
            }
            else {
                for (const value of type.values) {
                    try {
                        yield client.query(`ALTER TYPE ${type.name} ADD VALUE IF NOT EXISTS ${value}`);
                    }
                    catch (e) { }
                }
            }
        }
        // 3. Tables and Columns
        // USERS
        yield client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        role user_role NOT NULL DEFAULT 'CUSTOMER',
        full_name VARCHAR(255) NOT NULL,
        national_id VARCHAR(50) UNIQUE NOT NULL,
        phone_number VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE,
        date_of_birth DATE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_master BOOLEAN DEFAULT FALSE,
        permissions JSONB DEFAULT '[]',
        franchise_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        agent_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
        // Ensure missing columns in users
        yield client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT FALSE`);
        yield client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'`);
        console.log('✅ [Migration] Table users ensured');
        // WALLETS
        yield client.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        balance DECIMAL(15, 2) DEFAULT 0.00,
        total_deposits DECIMAL(15, 2) DEFAULT 0.00,
        total_bets DECIMAL(15, 2) DEFAULT 0.00,
        total_winnings DECIMAL(15, 2) DEFAULT 0.00,
        total_commissions DECIMAL(15, 2) DEFAULT 0.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
        console.log('✅ [Migration] Table wallets ensured');
        // DRAWS
        yield client.query(`
      CREATE TABLE IF NOT EXISTS draws (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        lottery_type lottery_type NOT NULL,
        draw_date DATE NOT NULL,
        draw_time TIME NOT NULL,
        status draw_status DEFAULT 'OPEN',
        winning_number VARCHAR(2) NULL,
        max_exposure_limit DECIMAL(15, 2) DEFAULT 50000.00,
        min_bet DECIMAL(12, 2) DEFAULT 100.00,
        max_bet DECIMAL(12, 2) DEFAULT 20000.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
        // Ensure missing columns in draws
        yield client.query(`ALTER TABLE draws ADD COLUMN IF NOT EXISTS max_exposure_limit DECIMAL(15, 2) DEFAULT 50000.00`);
        yield client.query(`ALTER TABLE draws ADD COLUMN IF NOT EXISTS min_bet DECIMAL(12, 2) DEFAULT 100.00`);
        yield client.query(`ALTER TABLE draws ADD COLUMN IF NOT EXISTS max_bet DECIMAL(12, 2) DEFAULT 20000.00`);
        console.log('✅ [Migration] Table draws ensured');
        // BETS
        yield client.query(`
      CREATE TABLE IF NOT EXISTS bets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        draw_id UUID NOT NULL REFERENCES draws(id),
        total_amount DECIMAL(15, 2) NOT NULL,
        commission_amount DECIMAL(15, 2) DEFAULT 0.00,
        agent_commission DECIMAL(15, 2) DEFAULT 0.00,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
        // Ensure missing columns in bets
        yield client.query(`ALTER TABLE bets ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(15, 2) DEFAULT 0.00`);
        yield client.query(`ALTER TABLE bets ADD COLUMN IF NOT EXISTS agent_commission DECIMAL(15, 2) DEFAULT 0.00`);
        console.log('✅ [Migration] Table bets ensured');
        // BET ITEMS
        yield client.query(`
      CREATE TABLE IF NOT EXISTS bet_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        bet_id UUID NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
        number VARCHAR(2) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        prize DECIMAL(15, 2) DEFAULT 0.00,
        status VARCHAR(20) DEFAULT 'PENDING'
      )
    `);
        console.log('✅ [Migration] Table bet_items ensured');
        // SINPE DEPOSITS
        yield client.query(`
      CREATE TABLE IF NOT EXISTS sinpe_deposits (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        amount DECIMAL(15, 2) NOT NULL,
        reference_number VARCHAR(100) UNIQUE NOT NULL,
        receipt_hash VARCHAR(64) UNIQUE NULL,
        sender_name VARCHAR(255) NULL,
        method_type VARCHAR(20) DEFAULT 'SINPE',
        status VARCHAR(20) DEFAULT 'PENDING',
        approved_by UUID NULL REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
        console.log('✅ [Migration] Table sinpe_deposits ensured');
        // WITHDRAWAL REQUESTS
        yield client.query(`
      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        amount DECIMAL(15, 2) NOT NULL,
        method VARCHAR(20) NOT NULL,
        details TEXT,
        status VARCHAR(20) DEFAULT 'PENDING',
        processed_by UUID NULL REFERENCES users(id),
        admin_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
        console.log('✅ [Migration] Table withdrawal_requests ensured');
        // WINNINGS
        yield client.query(`
      CREATE TABLE IF NOT EXISTS winnings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        bet_item_id UUID NOT NULL REFERENCES bet_items(id),
        user_id UUID NOT NULL REFERENCES users(id),
        draw_id UUID NOT NULL REFERENCES draws(id),
        amount DECIMAL(15, 2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
        console.log('✅ [Migration] Table winnings ensured');
        // COMMISSIONS
        yield client.query(`
      CREATE TABLE IF NOT EXISTS commissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        bet_id UUID NOT NULL REFERENCES bets(id),
        amount DECIMAL(15, 2) NOT NULL,
        type VARCHAR(20) DEFAULT 'SALE', -- SALE, WIN
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
        console.log('✅ [Migration] Table commissions ensured');
        // NOTIFICATIONS
        yield client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'SYSTEM',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
        console.log('✅ [Migration] Table notifications ensured');
        // SYSTEM SETTINGS
        yield client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
        console.log('✅ [Migration] Table system_settings ensured');
        // USER SESSIONS
        yield client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        ip_address VARCHAR(45),
        user_agent TEXT,
        last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
        console.log('✅ [Migration] Table user_sessions ensured');
        // AUDIT LOGS
        yield client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        action VARCHAR(255) NOT NULL,
        table_name VARCHAR(100),
        record_id UUID,
        old_data JSONB,
        new_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
        console.log('✅ [Migration] Table audit_logs ensured');
        // ADMIN LOGS
        yield client.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        admin_id UUID NOT NULL REFERENCES users(id),
        action VARCHAR(255) NOT NULL,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
        console.log('✅ [Migration] Table admin_logs ensured');
        // PAYMENT METHODS
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
        console.log('✅ [Migration] Table payment_methods ensured');
        // DRAW EXPOSURE
        yield client.query(`
      CREATE TABLE IF NOT EXISTS draw_exposure (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        draw_id UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
        number VARCHAR(2) NOT NULL,
        current_exposure DECIMAL(15, 2) DEFAULT 0.00,
        max_exposure DECIMAL(15, 2) DEFAULT 50000.00,
        is_closed BOOLEAN DEFAULT FALSE,
        UNIQUE(draw_id, number)
      )
    `);
        console.log('✅ [Migration] Table draw_exposure ensured');
        // WALLET TRANSACTIONS
        yield client.query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
        type tx_type NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        description TEXT,
        reference_id UUID NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
        console.log('✅ [Migration] Table wallet_transactions ensured');
        yield client.query('COMMIT');
        console.log('🚀 [Migration] System 100% updated and functional.');
    }
    catch (error) {
        yield client.query('ROLLBACK');
        console.error('❌ [Migration] Error during migration:', error);
    }
    finally {
        client.release();
    }
});
exports.runMigrations = runMigrations;
