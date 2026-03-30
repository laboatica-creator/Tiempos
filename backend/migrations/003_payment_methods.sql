-- Migración para payment_methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id SERIAL PRIMARY KEY,
  bank_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  account_number VARCHAR(50),
  type VARCHAR(20) DEFAULT 'SINPE',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar bancos de ejemplo
INSERT INTO payment_methods (bank_name, phone_number, account_number, type) VALUES
('Banco Nacional', '1234-5678', 'CR0000000', 'SINPE'),
('Banco de Costa Rica', '8765-4321', 'CR0000000', 'SINPE'),
('BAC San José', '1122-3344', 'CR0000000', 'SINPE')
ON CONFLICT DO NOTHING;
