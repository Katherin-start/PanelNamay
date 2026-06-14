-- Migración: añadir columnas faltantes en pagos (fecha_pago, comprobante)

BEGIN;

-- 1) Añadir columna fecha_pago si no existe
ALTER TABLE IF EXISTS public.pagos
  ADD COLUMN IF NOT EXISTS fecha_pago date;

-- 2) Añadir columna comprobante si no existe (para URL de imagen de comprobante)
ALTER TABLE IF EXISTS public.pagos
  ADD COLUMN IF NOT EXISTS comprobante text;

-- 3) Añadir columna estado_validacion si no existe (para saber si comprobante fue validado)
ALTER TABLE IF EXISTS public.pagos
  ADD COLUMN IF NOT EXISTS estado_validacion text DEFAULT 'PENDIENTE';

COMMIT;

-- Verificación:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name='pagos' ORDER BY column_name;
