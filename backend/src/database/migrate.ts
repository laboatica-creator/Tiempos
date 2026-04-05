import { pool } from './db';

/**
 * Executes comprehensive database migrations to ensure a 100% functional schema.
 */
export const runMigrations = async () => {
  console.log('🔄 [Migration] Starting comprehensive system migration...');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Ensure Extensions
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    // 2. Enum Types
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
        for (const value of type.values) {
          try {
            await client.query(`ALTER TYPE ${type.name} ADD VALUE IF NOT EXISTS ${value}`);
          } catch (e) {}
        }
      }
    }

    // 3. Tables and Columns
    
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
        is_master BOOLEAN DEFAULT FALSE,
        permissions JSONB DEFAULT '[]',
        franchise_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        agent_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT FALSE`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'`);
    console.log('✅ [Migration] Table users ensured');

    // WALLETS
    await client.query(`
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
    await client.query(`
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
    await client.query(`ALTER TABLE draws ADD COLUMN IF NOT EXISTS max_exposure_limit DECIMAL(15, 2) DEFAULT 50000.00`);
    await client.query(`ALTER TABLE draws ADD COLUMN IF NOT EXISTS min_bet DECIMAL(12, 2) DEFAULT 100.00`);
    await client.query(`ALTER TABLE draws ADD COLUMN IF NOT EXISTS max_bet DECIMAL(12, 2) DEFAULT 20000.00`);
    console.log('✅ [Migration] Table draws ensured');

    // BETS
    await client.query(`
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
    await client.query(`ALTER TABLE bets ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(15, 2) DEFAULT 0.00`);
    await client.query(`ALTER TABLE bets ADD COLUMN IF NOT EXISTS agent_commission DECIMAL(15, 2) DEFAULT 0.00`);
    console.log('✅ [Migration] Table bets ensured');

    // BET ITEMS
    await client.query(`
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
    await client.query(`
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
    await client.query(`ALTER TABLE sinpe_deposits ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) NULL`);
    await client.query(`ALTER TABLE sinpe_deposits ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE NULL`);
    console.log('✅ [Migration] Table sinpe_deposits ensured');

    // WITHDRAWAL REQUESTS
    await client.query(`
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
    await client.query(`
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
    await client.query(`
      CREATE TABLE IF NOT EXISTS commissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        bet_id UUID NOT NULL REFERENCES bets(id),
        amount DECIMAL(15, 2) NOT NULL,
        type VARCHAR(20) DEFAULT 'SALE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ [Migration] Table commissions ensured');

    // NOTIFICATIONS
    await client.query(`
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
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ [Migration] Table system_settings ensured');

    // USER SESSIONS
    await client.query(`
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
    await client.query(`
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
    await client.query(`
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
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) DEFAULT 'SINPE',
        bank_name VARCHAR(100),
        phone_number VARCHAR(20),
        account_number VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await client.query(`ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100)`);
    await client.query(`ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)`);
    await client.query(`ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS account_number VARCHAR(50)`);
    await client.query(`ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`);
    await client.query(`ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'SINPE'`);
    await client.query(`ALTER TABLE payment_methods ALTER COLUMN user_id DROP NOT NULL`);
    
    await client.query(`
      INSERT INTO payment_methods (bank_name, phone_number, type) VALUES
      ('Banco Nacional', '1234-5678', 'SINPE'),
      ('Banco de Costa Rica', '8765-4321', 'SINPE'),
      ('BAC San José', '1122-3344', 'SINPE')
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ [Migration] Table payment_methods ensured');

    // CARDS
    await client.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        card_number_masked VARCHAR(20),
        card_type VARCHAR(20),
        expiry_month INTEGER,
        expiry_year INTEGER,
        holder_name VARCHAR(100),
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ [Migration] Table cards ensured');

    // ANNOUNCEMENTS (corregido: sin start_date y end_date)
    await client.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        interval_seconds INTEGER DEFAULT 300,
        duration_seconds INTEGER DEFAULT 4,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ [Migration] Table announcements ensured');

    // PROMOTIONS (corregido: sin start_date y end_date)
    await client.query(`
      CREATE TABLE IF NOT EXISTS promotions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        bonus_amount DECIMAL(10,2) DEFAULT 0,
        trigger_condition JSONB,
        is_active BOOLEAN DEFAULT true,
        applied_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ [Migration] Table promotions ensured');

    // PROMOTION APPLICATIONS
    await client.query(`
      CREATE TABLE IF NOT EXISTS promotion_applications (
        id SERIAL PRIMARY KEY,
        promotion_id INTEGER REFERENCES promotions(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10,2),
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ [Migration] Table promotion_applications ensured');

    // DRAW EXPOSURE
    await client.query(`
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
    await client.query(`
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

    await client.query('COMMIT');
    console.log('🚀 [Migration] System 100% updated and functional.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [Migration] Error during migration:', error);
  } finally {
    client.release();
  }
};