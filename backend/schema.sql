-- PostgreSQL Schema for Tiempos Betting Platform

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ROLES ENUM
CREATE TYPE user_role AS ENUM ('CUSTOMER', 'AGENT', 'FRANCHISE', 'ADMIN');

-- USERS TABLE (Handles all user types)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    full_name VARCHAR(255) NOT NULL,
    national_id VARCHAR(50) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    date_of_birth DATE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    franchise_id UUID NULL, -- For agents or customers linked to a franchise
    agent_id UUID NULL,     -- For customers linked to an agent
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FRANCHISES VIEW (Optional but useful for querying)
-- Franchises and Agents are just Users with specific roles.

-- WALLETS
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(12, 2) DEFAULT 0.00,
    total_deposits DECIMAL(12, 2) DEFAULT 0.00,
    total_bets DECIMAL(12, 2) DEFAULT 0.00,
    total_winnings DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TRANSACTION TYPES
CREATE TYPE tx_type AS ENUM ('DEPOSIT', 'BET', 'WIN', 'WITHDRAW', 'COMMISSION');

-- WALLET TRANSACTIONS
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    type tx_type NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,
    reference_id UUID NULL, -- Link to bet_id, draw_id, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PAYMENT METHODS (Cards)
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- CREDIT, DEBIT
    provider VARCHAR(50) NOT NULL, -- VISA, MASTERCARD
    last4 VARCHAR(4) NOT NULL,
    expiry_date VARCHAR(10) NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SINPE DEPOSITS (Recharges)
CREATE TABLE sinpe_deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(12, 2) NOT NULL,
    reference_number VARCHAR(100) UNIQUE NOT NULL, -- SINPE Ref or CARD-XXXX
    sender_name VARCHAR(255) NULL,
    method_type VARCHAR(20) DEFAULT 'SINPE', -- SINPE, CARD
    receipt_hash VARCHAR(64) UNIQUE NULL, -- For duplicate image detection
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    approved_by UUID NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DRAW EXPOSURE (Risk Management)
CREATE TABLE draw_exposure (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draw_id UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
    number VARCHAR(2) NOT NULL,
    current_exposure DECIMAL(12, 2) DEFAULT 0.00,
    max_exposure DECIMAL(12, 2) DEFAULT 50000.00,
    is_closed BOOLEAN DEFAULT FALSE,
    UNIQUE(draw_id, number)
);

-- ADMIN LOGS
CREATE TABLE admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LOTTERY TYPES
CREATE TYPE lottery_type AS ENUM ('TICA', 'NICA');
CREATE TYPE draw_status AS ENUM ('OPEN', 'CLOSED', 'FINISHED');

-- DRAWS
CREATE TABLE draws (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lottery_type lottery_type NOT NULL,
    draw_date DATE NOT NULL,
    draw_time TIME NOT NULL,
    status draw_status DEFAULT 'OPEN',
    winning_number VARCHAR(2) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BETS (Tickets)
CREATE TABLE bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    draw_id UUID NOT NULL REFERENCES draws(id),
    total_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, WON, LOST
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BET ITEMS (Individual numbers on a ticket)
CREATE TABLE bet_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bet_id UUID NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
    number VARCHAR(2) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    prize DECIMAL(12, 2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'PENDING' -- PENDING, WON, LOST
);

-- WINNINGS
CREATE TABLE winnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bet_item_id UUID NOT NULL REFERENCES bet_items(id),
    user_id UUID NOT NULL REFERENCES users(id),
    draw_id UUID NOT NULL REFERENCES draws(id),
    amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add ForeignKey relations for franchise_id in Users table
ALTER TABLE users ADD CONSTRAINT fk_user_franchise FOREIGN KEY (franchise_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT fk_user_agent FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL;

-- INDEXES for Scalability
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_bets_user ON bets(user_id);
CREATE INDEX idx_bets_draw ON bets(draw_id);
CREATE INDEX idx_bet_items_bet ON bet_items(bet_id);
CREATE INDEX idx_bet_items_num_draw ON bet_items(number);
CREATE INDEX idx_draw_exposure_lookup ON draw_exposure(draw_id, number);
CREATE INDEX idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_sinpe_user ON sinpe_deposits(user_id);
CREATE INDEX idx_draws_date_time ON draws(draw_date, draw_time);
