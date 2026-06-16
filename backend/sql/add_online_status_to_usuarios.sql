-- Agregar columnas de presencia (online/last_seen) a tabla usuarios
-- Fecha: 2026-06-16
-- Motivo: chatSocket.js y getMobileChatContacts ya leen/escriben estas columnas,
-- pero no existían en la tabla, por lo que la consulta de contactos del chat
-- móvil fallaba silenciosamente y devolvía 0 contactos.
-- Nota: Estos DDL statements son idempotentes (IF NOT EXISTS)

BEGIN;

ALTER TABLE IF EXISTS public.usuarios
  ADD COLUMN IF NOT EXISTS online boolean DEFAULT false;

ALTER TABLE IF EXISTS public.usuarios
  ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT NULL;

COMMIT;
