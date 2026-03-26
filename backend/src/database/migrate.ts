import { pool } from './db';

/**
 * Executes database migrations to ensure all required tables exist.
 * Uses CREATE TABLE IF NOT EXISTS for idempotency.
 */
export const runMigrations = async () => {
  console.log('🔄 [Migration] Starting full automatic migrations...');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Ensure UUID extension exists
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ [Migration] Extension uuid-ossp ensured');

    // 2. Create Types (Checking if they exist first)
    const types = [
      { name: 'user_role', values: ["'CUSTOMER'", "'AGENT'", "'FRANCHISE'", "'ADMIN'"] },
      { name: 'lottery_type', values: ["'TICA'", "'NICA'"] },
      { name: 'draw_status', values: ["'OPEN'", "'CLOSED'", "'FINISHED'", "'CANCELLED'"] },
      { name: 'tx_type', values: ["'DEPOSIT'", "'BET'", "'WIN'", "'WITHDRAW'", "'COMMISSION'", "'REFUND'"] }
    ];

    for (const type of types) {
      const checkType = await client.query(`SELECT 1 FROM pg_type WHERE typname = '${type.name}'`);
      if (checkType.rowCount === 0) {
        await client.query(`CREATE TYPE ${type.name} AS ENUM (${type.values.join(', ')})`);
        console.log(`✅ [Migration] Type ${type.name} created`);
      } else {
        // Ensure all values exist in the enum
        for (const value of type.values) {
          try {
            // Postgres doesn't have "ADD VALUE IF NOT EXISTS" in a simple way before v16
            // but we can catch the error or use a DO block
            await client.query(`ALTER TYPE ${type.name} ADD VALUE IF NOT EXISTS ${value}`);
          } catch (e) {
            // Ignore error if value already exists
          }
        }
      }
    }

    // 3. Create Tables
    
    // USERS
    await client.query(`
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
        is_master BOOLEAN DEFAULT FALSE,
        permissions JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ [Migration] Table "users" ensured');

    // WALLETS
    await client.query(`
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
    await client.query(`
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
    await client.query(`
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
    await client.query(`
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
    await client.query(`
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
    await client.query(`
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

    // SINPE DEPOSITS
    await client.query(`
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
    console.log('✅ [Migration] Table "sinpe_deposits" ensured');

    // WITHDRAWAL REQUESTS
    await client.query(`
      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        amount DECIMAL(12, 2) NOT NULL,
        method VARCHAR(20) NOT NULL,
        details TEXT,
        status VARCHAR(20) DEFAULT 'PENDING',
        processed_by UUID NULL REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ [Migration] Table "withdrawal_requests" ensured');

    // WINNINGS
    await client.query(`
      CREATE TABLE IF NOT EXISTS winnings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        bet_item_id UUID NOT NULL REFERENCES bet_items(id),
        user_id UUID NOT NULL REFERENCES users(id),
        draw_id UUID NOT NULL REFERENCES draws(id),
        amount DECIMAL(12, 2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ [Migration] Table "winnings" ensured');

    // PAYMENT METHODS
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
    console.log('✅ [Migration] Table "payment_methods" ensured');

    // ADMIN LOGS
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        admin_id UUID NOT NULL REFERENCES users(id),
        action VARCHAR(255) NOT NULL,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ [Migration] Table "admin_logs" ensured');

    await client.query('COMMIT');
    console.log('🚀 [Migration] All migrations completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [Migration] Error during migration:', error);
  } finally {
    client.release();
  }
};
