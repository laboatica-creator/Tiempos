-- Tabla de anuncios para banner
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  interval_seconds INTEGER DEFAULT 300,
  duration_seconds INTEGER DEFAULT 4,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insertar anuncio de ejemplo
INSERT INTO announcements (message, is_active) 
VALUES ('Bienvenido a Tiempos Pro. ¡Buena suerte!', true);