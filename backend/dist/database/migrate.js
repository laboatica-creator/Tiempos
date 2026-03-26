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
 * Executes database migrations to ensure all required tables exist.
 * Uses CREATE TABLE IF NOT EXISTS for idempotency.
 */
const runMigrations = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('🔄 [Migration] Starting automatic migrations...');
    const client = yield db_1.pool.connect();
    try {
        yield client.query('BEGIN');
        // 1. Ensure UUID extension exists
        yield client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        console.log('✅ [Migration] Extension uuid-ossp ensured');
        // 2. Create Types (Checking if they exist first)
        const types = [
            { name: 'user_role', values: ["'CUSTOMER'", "'AGENT'", "'FRANCHISE'", "'ADMIN'"] },
            { name: 'lottery_type', values: ["'TICA'", "'NICA'"] },
            { name: 'draw_status', values: ["'OPEN'", "'CLOSED'", "'FINISHED'"] },
            { name: 'tx_type', values: ["'DEPOSIT'", "'BET'", "'WIN'", "'WITHDRAW'", "'COMMISSION'"] }
        ];
        for (const type of types) {
            const checkType = yield client.query(`SELECT 1 FROM pg_type WHERE typname = '${type.name}'`);
            if (checkType.rowCount === 0) {
                yield client.query(`CREATE TYPE ${type.name} AS ENUM (${type.values.join(', ')})`);
                console.log(`✅ [Migration] Type ${type.name} created`);
            }
        }
        // 3. Create Tables
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
        franchise_id UUID NULL,
        agent_id UUID NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
        console.log('✅ [Migration] Table "users" ensured');
        // WALLETS
        yield client.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        balance DECIMAL(12, 2) DEFAULT 0.00,
        total_deposits DECIMAL(12, 2) DEFAULT 0.00,
        total_bets DECIMAL(12, 2) DEFAULT 0.00,
        total_winnings DECIMAL(12, 2) DEFAULT 0.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
        console.log('✅ [Migration] Table "wallets" ensured');
        // DRAWS
        yield client.query(`
      CREATE TABLE IF NOT EXISTS draws (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        lottery_type lottery_type NOT NULL,
        draw_date DATE NOT NULL,
        draw_time TIME NOT NULL,
        status draw_status DEFAULT 'OPEN',
        winning_number VARCHAR(2) NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
        console.log('✅ [Migration] Table "draws" ensured');
        // BETS
        yield client.query(`
      CREATE TABLE IF NOT EXISTS bets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        draw_id UUID NOT NULL REFERENCES draws(id),
        total_amount DECIMAL(12, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
        console.log('✅ [Migration] Table "bets" ensured');
        // BET ITEMS
        yield client.query(`
      CREATE TABLE IF NOT EXISTS bet_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        bet_id UUID NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
        number VARCHAR(2) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        prize DECIMAL(12, 2) DEFAULT 0.00,
        status VARCHAR(20) DEFAULT 'PENDING'
      )
    `);
        console.log('✅ [Migration] Table "bet_items" ensured');
        // DRAW EXPOSURE
        yield client.query(`
      CREATE TABLE IF NOT EXISTS draw_exposure (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        draw_id UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
        number VARCHAR(2) NOT NULL,
        current_exposure DECIMAL(12, 2) DEFAULT 0.00,
        max_exposure DECIMAL(12, 2) DEFAULT 50000.00,
        is_closed BOOLEAN DEFAULT FALSE,
        UNIQUE(draw_id, number)
      )
    `);
        console.log('✅ [Migration] Table "draw_exposure" ensured');
        // WALLET TRANSACTIONS
        yield client.query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
        type tx_type NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        description TEXT,
        reference_id UUID NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
        console.log('✅ [Migration] Table "wallet_transactions" ensured');
        yield client.query('COMMIT');
        console.log('🚀 [Migration] All migrations completed successfully');
    }
    catch (error) {
        yield client.query('ROLLBACK');
        console.error('❌ [Migration] Error during migration:', error);
        // We don't throw here to avoid stopping the server unless it's critical,
        // but the user requested clear logs.
    }
    finally {
        client.release();
    }
});
exports.runMigrations = runMigrations;
