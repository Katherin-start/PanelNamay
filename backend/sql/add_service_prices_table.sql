-- Tabla para servicios / precios de consulta definidos por administración
-- Ejecutar en Supabase SQL editor o psql conectado a la base de datos.

create extension if not exists "pgcrypto";

create table if not exists servicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  precio numeric(12,2) not null default 0,
  activo boolean not null default true,
  creado_por uuid references usuarios(id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists servicios_activo_idx on servicios(activo);
create index if not exists servicios_nombre_idx on servicios(nombre);
