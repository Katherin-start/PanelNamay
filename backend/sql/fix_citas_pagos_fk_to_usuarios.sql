-- Migración: arreglar FK en CITAS y PAGOS para apuntar a usuarios(id)
-- Esto resuelve el error "violates foreign key constraint fk_citas_paciente_uuid"

BEGIN;

-- 1) Eliminar FK existente en citas (si apunta a pacientes)
ALTER TABLE IF EXISTS public.citas
  DROP CONSTRAINT IF EXISTS fk_citas_paciente_uuid;

-- 2) Eliminar FK existente en pagos (si existe)
ALTER TABLE IF EXISTS public.pagos
  DROP CONSTRAINT IF EXISTS fk_pagos_paciente_uuid;

-- 3) Crear FK en citas hacia usuarios(id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='citas' AND column_name='id_paciente_uuid') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      WHERE tc.table_name = 'citas' AND tc.constraint_type = 'FOREIGN KEY' 
        AND tc.constraint_name = 'fk_citas_paciente_uuid'
    ) THEN
      ALTER TABLE public.citas
        ADD CONSTRAINT fk_citas_paciente_uuid FOREIGN KEY (id_paciente_uuid) REFERENCES public.usuarios(id) ON DELETE CASCADE;
      RAISE NOTICE 'FK creada en citas.id_paciente_uuid -> usuarios.id';
    END IF;
  END IF;
END$$;

-- 4) Crear FK en pagos hacia usuarios(id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pagos' AND column_name='id_paciente_uuid') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      WHERE tc.table_name = 'pagos' AND tc.constraint_type = 'FOREIGN KEY' 
        AND tc.constraint_name = 'fk_pagos_paciente_uuid'
    ) THEN
      ALTER TABLE public.pagos
        ADD CONSTRAINT fk_pagos_paciente_uuid FOREIGN KEY (id_paciente_uuid) REFERENCES public.usuarios(id) ON DELETE CASCADE;
      RAISE NOTICE 'FK creada en pagos.id_paciente_uuid -> usuarios.id';
    END IF;
  END IF;
END$$;

COMMIT;

-- Verificación:
-- SELECT constraint_name, table_name, column_name 
-- FROM information_schema.key_column_usage 
-- WHERE table_name IN ('citas', 'pagos') AND column_name = 'id_paciente_uuid';
