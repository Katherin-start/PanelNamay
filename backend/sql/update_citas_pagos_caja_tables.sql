-- Migración: Asegurar columnas y tablas necesarias para citas, pagos y caja
-- Fecha: 2026-06-10

CREATE TABLE IF NOT EXISTS public.caja (
  id int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fecha date,
  monto_inicial numeric,
  monto_final numeric,
  estado varchar,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.citas (
  id int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_paciente int4,
  id_odontologo uuid,
  fecha date,
  hora time,
  estado varchar,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  nota_cancelacion text
);

CREATE TABLE IF NOT EXISTS public.pagos (
  id int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_paciente int4,
  monto numeric,
  metodo_pago varchar,
  estado varchar,
  fecha timestamp DEFAULT CURRENT_TIMESTAMP,
  comprobante text,
  estado_validacion varchar,
  id_cita int4,
  qr_imagen text,
  fecha_validacion timestamp,
  validado_por uuid
);

ALTER TABLE public.citas
  ADD COLUMN IF NOT EXISTS id_paciente int4,
  ADD COLUMN IF NOT EXISTS id_odontologo uuid,
  ADD COLUMN IF NOT EXISTS fecha date,
  ADD COLUMN IF NOT EXISTS hora time,
  ADD COLUMN IF NOT EXISTS estado varchar,
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS nota_cancelacion text;

ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS id_paciente int4,
  ADD COLUMN IF NOT EXISTS monto numeric,
  ADD COLUMN IF NOT EXISTS metodo_pago varchar,
  ADD COLUMN IF NOT EXISTS estado varchar,
  ADD COLUMN IF NOT EXISTS fecha timestamp DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS comprobante text,
  ADD COLUMN IF NOT EXISTS estado_validacion varchar,
  ADD COLUMN IF NOT EXISTS id_cita int4,
  ADD COLUMN IF NOT EXISTS qr_imagen text,
  ADD COLUMN IF NOT EXISTS fecha_validacion timestamp,
  ADD COLUMN IF NOT EXISTS validado_por uuid;

ALTER TABLE public.caja
  ADD COLUMN IF NOT EXISTS fecha date,
  ADD COLUMN IF NOT EXISTS monto_inicial numeric,
  ADD COLUMN IF NOT EXISTS monto_final numeric,
  ADD COLUMN IF NOT EXISTS estado varchar,
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'citas_id_paciente_fkey'
      AND table_name = 'citas'
  ) THEN
    ALTER TABLE public.citas
      ADD CONSTRAINT citas_id_paciente_fkey FOREIGN KEY (id_paciente) REFERENCES public.pacientes(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'citas_id_odontologo_fkey'
      AND table_name = 'citas'
  ) THEN
    ALTER TABLE public.citas
      ADD CONSTRAINT citas_id_odontologo_fkey FOREIGN KEY (id_odontologo) REFERENCES public.usuarios(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'pagos_id_paciente_fkey'
      AND table_name = 'pagos'
  ) THEN
    ALTER TABLE public.pagos
      ADD CONSTRAINT pagos_id_paciente_fkey FOREIGN KEY (id_paciente) REFERENCES public.pacientes(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'pagos_id_cita_fkey'
      AND table_name = 'pagos'
  ) THEN
    ALTER TABLE public.pagos
      ADD CONSTRAINT pagos_id_cita_fkey FOREIGN KEY (id_cita) REFERENCES public.citas(id);
  END IF;
END;
$$;
