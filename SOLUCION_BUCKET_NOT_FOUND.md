# Solución Rápida: Error "Bucket not found" en Chat

## El Problema
Al intentar enviar un documento o imagen en el chat, recibe el error:
```
No se pudo enviar el mensaje: Error interno: Bucket not found
```

## Las Causas
- El bucket `chat-files` no existe en Supabase Storage
- El bucket existe pero no es público
- Problemas de permisos en el bucket

## Soluciones

### ✅ SOLUCIÓN 1: Crear el Bucket (Recomendado)

1. **Abre Supabase Console**
   - Ve a https://app.supabase.com
   - Inicia sesión con tu cuenta

2. **Selecciona tu proyecto**
   - En el panel izquierdo, ve a **Storage**

3. **Crea el bucket**
   - Haz clic en **Create Bucket**
   - Nombre: `chat-files`
   - ✅ Marca **Public bucket**
   - Haz clic en **Create**

4. **Listo**
   - El sistema intentará crear el bucket automáticamente en el siguiente envío
   - Si sigue sin funcionar, intenta la Solución 2

---

### ✅ SOLUCIÓN 2: Usar SQL Editor (Si la Solución 1 no funciona)

1. En Supabase Console, ve a **SQL Editor**
2. Crea una nueva query
3. Copia y pega esto:

```sql
-- Crear bucket para chat
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Configurar permisos básicos
-- Si ya existen las políticas, esto no las afectará
```

4. Haz clic en **Run** (botón azul)
5. Verifica que no haya errores

---

### ✅ SOLUCIÓN 3: Verificar Permisos RLS

Si aún tienes problemas después de crear el bucket:

1. En Supabase Console, ve a **Storage** → **chat-files**
2. Haz clic en la pestaña **Policies**
3. Verifica que existan políticas para:
   - ✅ SELECT (lectura)
   - ✅ INSERT (escritura)
   - ✅ DELETE (eliminación)

Si no existen, ejecuta esto en SQL Editor:

```sql
-- Crear políticas de RLS para chat-files bucket
CREATE POLICY "Allow authenticated SELECT"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-files' AND auth.role() = 'authenticated_user');

CREATE POLICY "Allow authenticated INSERT"  
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-files' AND auth.role() = 'authenticated_user');

CREATE POLICY "Allow authenticated DELETE"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-files' AND auth.role() = 'authenticated_user');
```

---

## ✅ Validación

Después de seguir los pasos, intenta:
1. Abre el chat
2. Selecciona un contacto
3. Intenta enviar un archivo pequeño (imagen o PDF)
4. ¡Debería funcionar!

---

## 🆘 Si Sigue Sin Funcionar

Verifica:
- ✅ El backend está corriendo en `localhost:4000`
- ✅ Las variables de entorno `.env` del backend tienen:
  - `SUPABASE_URL`
  - `SUPABASE_KEY`
- ✅ Tienes conexión a internet
- ✅ El archivo no supera 20 MB

---

## 📝 Notas Importantes

- **Tamaño máximo**: 20 MB por archivo
- **Tipos soportados**: Imágenes, PDFs, Word, Excel, etc.
- **Almacenamiento público**: Los archivos son accesibles públicamente
- **Gratuito**: Los primeros 1 GB están incluidos en Supabase gratis
