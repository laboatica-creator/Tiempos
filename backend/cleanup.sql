-- Truncate all tables
TRUNCATE TABLE bet_items, bets, winnings, draw_exposure, sinpe_deposits, wallet_transactions, wallets, admin_logs, draws, users CASCADE;

-- Insert Example Admin
-- Using fixed UUIDs for predictability in scripts if needed, or just let it generate.
INSERT INTO users (id, full_name, national_id, phone_number, email, date_of_birth, password_hash, role)
VALUES (
    uuid_generate_v4(),
    'Administrador Tiempos', 
    '100000001', 
    '+50688888888', 
    'laboarica@hotmail.com', 
    '1985-05-15', 
    '$2b$10$I/EKJ6.ApfCu5DkH8RjBqOOjZye08ltXHNMg2AW1f.kMTOgIXNAne', 
    'ADMIN'
);

-- Insert Example User (Player)
INSERT INTO users (id, full_name, national_id, phone_number, email, date_of_birth, password_hash, role)
VALUES (
    uuid_generate_v4(),
    'Usuario Ejemplo', 
    '100000002', 
    '+50677777777', 
    'usuario@tiempos.com', 
    '1995-10-20', 
    '$2b$10$rXU/49Mfe6GjEWHITPy5CeWIc.wqBQMfwGwVKXV9zImyFBkmKeNaG', 
    'CUSTOMER'
);

-- Initialize wallets for inserted users
INSERT INTO wallets (user_id, balance) 
SELECT id, 125000.00 FROM users;

-- Log the initialization
INSERT INTO admin_logs (admin_id, action, details)
SELECT id, 'DB_CLEANUP', '{"message": "Base de datos limpiada, configurado entorno de ejemplo."}'::jsonb 
FROM users WHERE role = 'ADMIN' LIMIT 1;
