-- Añade columna biografia a usuarios y crea tabla resenas
-- Ejecutar en Supabase SQL Editor o como migración

ALTER TABLE IF EXISTS usuarios
ADD COLUMN IF NOT EXISTS biografia text;

CREATE TABLE IF NOT EXISTS resenas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  id_odontologo uuid NOT NULL,
  id_paciente uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comentario text,
  creado_en timestamptz DEFAULT now(),
  CONSTRAINT fk_odontologo FOREIGN KEY (id_odontologo) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_paciente FOREIGN KEY (id_paciente) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_resenas_odontologo ON resenas(id_odontologo);
CREATE INDEX IF NOT EXISTS idx_resenas_paciente ON resenas(id_paciente);
