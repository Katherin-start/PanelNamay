-- Migración: arreglar FK en pagos y añadir id_paciente_uuid único en pacientes
-- 1) Elimina la constraint FK existente en pagos (si existe)
-- 2) Añade la columna id_paciente_uuid a pacientes (si no existe)
-- 3) Crea un índice/constraint UNIQUE sobre pacientes.id_paciente_uuid
-- 4) Añade foto_perfil a pacientes (si no existe)
-- 5) Recrea la FK en pagos apuntando a pacientes(id_paciente_uuid)

BEGIN;

-- 1) Eliminar FK existente en pagos
ALTER TABLE IF EXISTS public.pagos
  DROP CONSTRAINT IF EXISTS fk_pagos_paciente_uuid;

-- 2) Añadir columna id_paciente_uuid en pacientes (si no existe)
ALTER TABLE IF EXISTS public.pacientes
  ADD COLUMN IF NOT EXISTS id_paciente_uuid uuid;

-- 3) Crear constraint UNIQUE en pacientes.id_paciente_uuid (requerido para FK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_name = kcu.table_name
    WHERE tc.table_name = 'pacientes' AND tc.constraint_type = 'UNIQUE' AND kcu.column_name = 'id_paciente_uuid'
  ) THEN
    ALTER TABLE public.pacientes
      ADD CONSTRAINT pacientes_id_paciente_uuid_unique UNIQUE (id_paciente_uuid);
  END IF;
END$$;

-- 4) Añadir columna foto_perfil a pacientes (si no existe)
ALTER TABLE IF EXISTS public.pacientes
  ADD COLUMN IF NOT EXISTS foto_perfil text;

-- 5) Recrear FK en pagos referenciando pacientes(id_paciente_uuid)
-- Nota: la columna en pagos debe existir y llamarse `id_paciente_uuid`.
-- Si prefieres que pagos referencie `usuarios(id)` en lugar de pacientes, cambia la referencia.
DO $$
BEGIN
  -- Solo añadir la FK si la columna existe en pagos y no existe la constraint
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pagos' AND column_name='id_paciente_uuid') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='pagos' AND constraint_type='FOREIGN KEY' AND constraint_name='fk_pagos_paciente_uuid') THEN
      ALTER TABLE public.pagos
        ADD CONSTRAINT fk_pagos_paciente_uuid FOREIGN KEY (id_paciente_uuid) REFERENCES public.pacientes(id_paciente_uuid) ON DELETE CASCADE;
    END IF;
  END IF;
END$$;

COMMIT;

-- WARNING:
-- Si la tabla `pacientes` no debe contener la columna `id_paciente_uuid`, o si prefieres
-- que `pagos.id_paciente_uuid` haga FK a `usuarios(id)`, adapta este script para apuntar
-- a public.usuarios(id) en lugar de public.pacientes(id_paciente_uuid).
