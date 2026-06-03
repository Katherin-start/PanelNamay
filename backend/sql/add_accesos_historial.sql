CREATE TABLE IF NOT EXISTS accesos_historial (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  id_paciente integer NOT NULL,
  id_odontologo uuid NOT NULL,
  otorgado_por uuid NOT NULL,
  otorgado_en timestamptz DEFAULT now(),
  revocado_en timestamptz,
  activo boolean DEFAULT true,

  CONSTRAINT fk_paciente_acceso
    FOREIGN KEY (id_paciente)
    REFERENCES pacientes(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_odontologo_acceso
    FOREIGN KEY (id_odontologo)
    REFERENCES usuarios(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_otorgado_por
    FOREIGN KEY (otorgado_por)
    REFERENCES usuarios(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_accesos_paciente
ON accesos_historial(id_paciente);

CREATE INDEX IF NOT EXISTS idx_accesos_odontologo
ON accesos_historial(id_odontologo);