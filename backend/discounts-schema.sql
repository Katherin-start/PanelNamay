-- Tabla de descuentos autorizados (flujo: recepcionista solicita -> admin aprueba -> visible en móvil)
CREATE TABLE IF NOT EXISTS public.descuentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text,
  nombre text NOT NULL,
  descripcion text,
  tipo text NOT NULL CHECK (tipo IN ('porcentaje','monto')),
  valor numeric NOT NULL CHECK (valor >= 0),
  aplica_a text NOT NULL DEFAULT 'TODOS',
  fecha_inicio date,
  fecha_fin date,
  creado_por uuid NOT NULL, -- id de usuario que solicita (auth.uid())
  solicitado_en timestamptz DEFAULT now(),
  creado_en timestamptz DEFAULT now(),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobado','rechazado','inactivo')),
  aprobado_por uuid NULL,
  aprobado_en timestamptz NULL,
  visible boolean NOT NULL DEFAULT false,
  activo boolean NOT NULL DEFAULT true
);

-- Añadir columnas de descuento a la tabla pagos si no existen
ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS descuento_id uuid,
  ADD COLUMN IF NOT EXISTS descuento_codigo text,
  ADD COLUMN IF NOT EXISTS descuento_tipo text,
  ADD COLUMN IF NOT EXISTS descuento_valor numeric,
  ADD COLUMN IF NOT EXISTS monto_descuento numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monto_final numeric DEFAULT 0;

-- Asegurar columna aplica_a en descuentos (para compatibilidad con payloads del frontend)
ALTER TABLE public.descuentos
  ADD COLUMN IF NOT EXISTS aplica_a text NOT NULL DEFAULT 'TODOS';

-- Asegurar columna creado_en (timestamp) en descuentos
ALTER TABLE public.descuentos
  ADD COLUMN IF NOT EXISTS creado_en timestamptz DEFAULT now();

-- Función helper para obtener el role del usuario desde tablas comunes (si existen)
create or replace function public.current_user_role()
returns text stable language plpgsql as $$
declare
  r text;
begin
  if to_regclass('public.usuarios') is not null then
    select role into r from public.usuarios where id = auth.uid();
  elsif to_regclass('public.profiles') is not null then
    select role into r from public.profiles where id = auth.uid();
  elsif to_regclass('public.profiles') is not null then
    select role into r from public.profiles where id = auth.uid();
  else
    r := null;
  end if;
  return coalesce(r, 'usuario');
end;
$$;

-- Trigger: al aprobar (estado='aprobado') marcar aprobado_en y visible
create or replace function public.descuentos_set_approved_fields()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.estado = 'aprobado' then
      new.aprobado_en = coalesce(new.aprobado_en, now());
      new.visible = true;
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if new.estado = 'aprobado' and old.estado is distinct from 'aprobado' then
      new.aprobado_en = coalesce(new.aprobado_en, now());
      new.visible = true;
      new.aprobado_por = coalesce(new.aprobado_por, auth.uid());
    elsif new.estado <> 'aprobado' then
      new.visible = false;
      if new.estado = 'rechazado' then
        new.aprobado_en = null;
        -- mantener aprobado_por null
      end if;
    end if;
    return new;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_descuentos_set_approved_fields on public.descuentos;
create trigger trg_descuentos_set_approved_fields
before insert or update on public.descuentos
for each row execute function public.descuentos_set_approved_fields();

-- Habilitar Row Level Security y políticas

-- DESCUENTOS: RLS
alter table public.descuentos enable row level security;

-- SELECT: admin ve todo; creador ve sus solicitudes; móviles/usuarios ven sólo donde visible = true
create policy "descuentos_select_visible_or_roles" on public.descuentos
  for select using (
    public.current_user_role() = 'admin'
    or creado_por = auth.uid()
    or (visible = true)
  );

-- INSERT: sólo recepcionista puede solicitar (estado = 'solicitado' y creado_por = auth.uid()), o admin puede insertar
create policy "descuentos_insert_recepcionista" on public.descuentos
  for insert with check (
    (
      public.current_user_role() = 'recepcionista'
      and estado = 'pendiente'
      and creado_por = auth.uid()
    )
    or public.current_user_role() = 'admin'
  );

-- UPDATE: admin puede aprobar/rechazar; creador puede cancelar (poner 'inactivo') si aún está 'solicitado'
create policy "descuentos_update_admin" on public.descuentos
  for update using (
    public.current_user_role() = 'admin'
  ) with check (
    public.current_user_role() = 'admin'
  );

create policy "descuentos_update_creator_cancel" on public.descuentos
  for update using (
    creado_por = auth.uid()
  ) with check (
    creado_por = auth.uid()
    and estado in ('pendiente','inactivo')
  );

create policy "descuentos_delete_admin" on public.descuentos
  for delete using ( public.current_user_role() = 'admin' );

-- PAGOS: asegurar que la recepcionista NO tenga acceso al sector de pagos
-- Habilitar RLS en pagos y crear políticas que permitan solo a 'admin' y 'cajero' operar, y al creador ver su propio pago
alter table public.pagos enable row level security;

create policy "pagos_select_admin_cajero_owner" on public.pagos
  for select using (
    public.current_user_role() = 'admin'
    or public.current_user_role() = 'cajero'
    or creado_por = auth.uid()
  );

create policy "pagos_insert_cajero_or_admin" on public.pagos
  for insert with check (
    public.current_user_role() in ('cajero','admin')
  );

create policy "pagos_update_admin_or_processor" on public.pagos
  for update using (
    public.current_user_role() = 'admin'
    or public.current_user_role() = 'cajero'
  ) with check (
    public.current_user_role() in ('admin','cajero')
  );

create policy "pagos_delete_admin" on public.pagos
  for delete using ( public.current_user_role() = 'admin' );

-- Índices útiles
create index if not exists idx_pagos_creado_por on public.pagos(creado_por);
create index if not exists idx_descuentos_creado_por on public.descuentos(creado_por);
create index if not exists idx_descuentos_estado on public.descuentos(estado);

-- Notas:
-- - El frontend móvil debe solicitar sólo descuentos con `visible = true`.
-- - El rol `recepcionista` sólo puede crear solicitudes de descuento (estado = 'solicitado').
-- - El administrador (`admin`) debe actualizar la fila para aprobar: set estado = 'aprobado' y aprobado_por = auth.uid(). El trigger pondrá `aprobado_en` y `visible = true`.
-- - Para integrar con tu app, asegura que al registrar usuarios guardes su rol en `public.usuarios` o `public.profiles` según tu esquema.

-- Fin del script de descuentos y RLS

-- Asegurar constraint de estado (case-insensitive) — idempotente
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'descuentos_estado_check') THEN
    ALTER TABLE public.descuentos DROP CONSTRAINT IF EXISTS descuentos_estado_check;
  END IF;
  ALTER TABLE public.descuentos
    ADD CONSTRAINT descuentos_estado_check CHECK (lower(estado) IN ('pendiente','aprobado','rechazado','inactivo'));
EXCEPTION WHEN duplicate_object THEN
  -- ignore
  NULL;
END$$;
