-- Tabla de promociones
CREATE TABLE IF NOT EXISTS promotions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  bonus_amount DECIMAL(10,2) DEFAULT 0,
  trigger_condition JSONB,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  applied_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de aplicaciones de promociones
CREATE TABLE IF NOT EXISTS promotion_applications (
  id SERIAL PRIMARY KEY,
  promotion_id INTEGER REFERENCES promotions(id),
  user_id UUID REFERENCES users(id),
  amount DECIMAL(10,2),
  applied_at TIMESTAMP DEFAULT NOW()
);

-- Insertar promoción de ejemplo
INSERT INTO promotions (name, description, type, bonus_amount, is_active) 
VALUES ('Bono de Bienvenida', '₡2000 para nuevos usuarios', 'NEW_USER_BONUS', 2000, true);