-- Agregar columnas faltantes a tabla pagos
-- Fecha: 2026-06-10
-- Nota: Estos DDL statements son idempotentes (IF NOT EXISTS)

BEGIN;

-- Columnas básicas que probablemente faltan
ALTER TABLE IF EXISTS public.pagos
  ADD COLUMN IF NOT EXISTS id_paciente_uuid uuid DEFAULT NULL;

ALTER TABLE IF EXISTS public.pagos
  ADD COLUMN IF NOT EXISTS servicio varchar(255) DEFAULT NULL;

ALTER TABLE IF EXISTS public.pagos
  ADD COLUMN IF NOT EXISTS descripcion text DEFAULT NULL;

ALTER TABLE IF EXISTS public.pagos
  ADD COLUMN IF NOT EXISTS qr_imagen text DEFAULT NULL;

ALTER TABLE IF EXISTS public.pagos
  ADD COLUMN IF NOT EXISTS estado_validacion varchar(50) DEFAULT NULL;

ALTER TABLE IF EXISTS public.pagos
  ADD COLUMN IF NOT EXISTS monto_final numeric DEFAULT NULL;

ALTER TABLE IF EXISTS public.pagos
  ADD COLUMN IF NOT EXISTS comprobante text DEFAULT NULL;

-- Crear FK hacia usuarios(id) para id_paciente_uuid si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pagos_id_paciente_uuid_fkey'
      AND table_name = 'pagos'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.pagos
      ADD CONSTRAINT pagos_id_paciente_uuid_fkey
      FOREIGN KEY (id_paciente_uuid) REFERENCES public.usuarios(id) ON DELETE CASCADE;
  END IF;
END$$;

COMMIT;
