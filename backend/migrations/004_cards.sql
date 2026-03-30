-- Migración para cards
CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  card_number_masked VARCHAR(20),
  card_type VARCHAR(20),
  expiry_month INTEGER,
  expiry_year INTEGER,
  holder_name VARCHAR(100),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
