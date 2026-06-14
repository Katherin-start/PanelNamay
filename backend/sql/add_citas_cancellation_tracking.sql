-- Migración: Agregar seguimiento de cancelación de citas
-- Propósito: Guardar citas como canceladas en lugar de borrarlas, y agregar índice único para evitar doble-reserva
-- Fecha: 2026-06-09

-- 1. Agregar columna para guardar nota de cancelación
ALTER TABLE citas
ADD COLUMN IF NOT EXISTS nota_cancelacion TEXT;

-- 2. Agregar comentario a la columna
COMMENT ON COLUMN citas.nota_cancelacion IS 'Motivo o mensaje de error que llevó a la cancelación de la cita (ej: error al crear pago)';

-- 3. Crear índice único compuesto para evitar doble-reserva (condiciones de carrera)
-- Este índice asegura que no haya dos citas en el mismo horario para el mismo odontólogo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'uniq_citas_doctor_fecha_hora'
  ) THEN
    CREATE UNIQUE INDEX uniq_citas_doctor_fecha_hora 
    ON citas (id_odontologo, fecha, hora) 
    WHERE estado NOT IN ('cancelada', 'rechazada');
  END IF;
END
$$;

-- Verificación: mostrar citas recientes con nota de cancelación
-- SELECT id, id_paciente, id_odontologo, fecha, hora, estado, nota_cancelacion 
-- FROM citas 
-- WHERE nota_cancelacion IS NOT NULL 
-- ORDER BY creado_en DESC LIMIT 10;
