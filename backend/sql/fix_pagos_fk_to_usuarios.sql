-- Migración alternativa: que `pagos.id_paciente_uuid` haga FK a `usuarios(id)`
-- Esto evita requerir cambios en la tabla `pacientes`.

BEGIN;

-- Eliminar constraint existente si existe
ALTER TABLE IF EXISTS public.pagos
  DROP CONSTRAINT IF EXISTS fk_pagos_paciente_uuid;

-- Añadir FK hacia public.usuarios(id) si la columna existe y no existe ya la constraint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pagos' AND column_name='id_paciente_uuid') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_name = kcu.table_name
      WHERE tc.table_name = 'pagos' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'id_paciente_uuid'
    ) THEN
      ALTER TABLE public.pagos
        ADD CONSTRAINT fk_pagos_paciente_uuid FOREIGN KEY (id_paciente_uuid) REFERENCES public.usuarios(id) ON DELETE CASCADE;
    END IF;
  END IF;
END$$;

COMMIT;

-- Nota: asegúrate de que `pagos.id_paciente_uuid` almacena UUIDs compatibles con `usuarios.id`.
-- Si algunos registros de `pagos` tienen valores enteros en `id_paciente` en su lugar,
-- deberás migrarlos/convertirlos antes de aplicar la FK.
