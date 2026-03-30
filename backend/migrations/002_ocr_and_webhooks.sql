-- Tabla para logs de OCR
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS ocr_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  image_url TEXT,
  filename TEXT,
  extracted_text TEXT,
  extracted_data JSONB,
  amount DECIMAL(12, 2),
  reference_number VARCHAR(100),
  sender_name VARCHAR(100),
  date_extracted VARCHAR(100),
  status VARCHAR(20) DEFAULT 'PENDING',
  transaction_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at);
