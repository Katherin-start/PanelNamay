# Configuración de Supabase para Chat

## Crear Bucket de Storage

Si recibe el error "Bucket not found" al enviar archivos en el chat, siga estos pasos:

### Opción 1: Crear manualmente en el Dashboard de Supabase

1. Ve a [Supabase Console](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Storage** en el menú lateral izquierdo
4. Haz clic en **Create Bucket**
5. Ingresa el nombre: `chat-files`
6. Selecciona **Public bucket** (para que los archivos sean accesibles públicamente)
7. Haz clic en **Create Bucket**

### Opción 2: Crear con SQL

Si prefieres usar SQL, ejecuta esto en el SQL Editor de Supabase:

```sql
-- Crear bucket para archivos de chat
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-files', 'chat-files', true);

-- Si ya existe, solo actualizar a público
UPDATE storage.buckets 
SET public = true 
WHERE name = 'chat-files';
```

### Opción 3: Permisos de RLS (Row Level Security)

Asegúrate de que los permisos están configurados correctamente:

```sql
-- Permitir que cualquier usuario autenticado lea archivos
CREATE POLICY "Allow read access for authenticated users"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-files' AND auth.role() = 'authenticated_user');

-- Permitir que los usuarios autenticados suban archivos
CREATE POLICY "Allow upload for authenticated users"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-files' AND auth.role() = 'authenticated_user');

-- Permitir que los usuarios eliminen sus propios archivos
CREATE POLICY "Allow delete for authenticated users"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-files' AND auth.role() = 'authenticated_user');
```

## Variables de Entorno

Asegúrate de tener estas variables en tu archivo `.env`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

## Límite de Tamaño

El límite máximo de archivo es de **20 MB**. Esto se configura en:
- Frontend: `ChatPage.tsx` (validación antes de enviar)
- Backend: `uploadChatAttachment` (validación en servidor)

## Solución de Problemas

### Error: "Bucket not found"
- Verifica que el bucket `chat-files` existe en Storage
- Verifica que el bucket está configurado como **public**

### Error: "Permission denied"
- Comprueba las políticas de RLS del bucket
- Verifica que tu usuario tiene permisos de lectura/escritura

### Error: "File too large"
- El archivo supera 20 MB
- Usa archivos más pequeños

## Tipos de Archivo Soportados

- **Imágenes**: PNG, JPG, JPEG, GIF, WebP, SVG, BMP
- **Documentos**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT
- **Archivos**: ZIP, RAR, CSV, JSON, XML
