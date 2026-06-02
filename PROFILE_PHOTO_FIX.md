# 📸 Guía de Carga de Fotos de Perfil - Solución Completa

## ✅ Cambios Realizados

### 1. Backend - setupController.js
**Problema**: El bucket `profile-photos` no se inicializaba automáticamente.

**Solución**: Actualizado `initializeStorage()` para crear ambos buckets:
- `chat-files` (20MB)
- `profile-photos` (5MB) ← **NUEVO**

**Como usarlo**:
```bash
curl -X POST http://localhost:4000/api/setup/initialize-storage
```

### 2. Backend - authController.js
**Cambios**:
- Eliminada lógica de crear bucket en cada upload (ahora confía en setupController)
- Agregado mejor logging con emojis para depuración
- Validaciones más claras de URL pública

### 3. Backend - mobileController.js
**Cambios**:
- Mismas mejoras que authController
- Simplificado código de upload
- Mejor manejo de errores

### 4. Frontend - DashboardLayout.tsx
**Cambios**:
- Agregado console.log detallado para depuración
- Mejor mensajes de error al usuario
- Validación más clara de la respuesta

### 5. Frontend - api.ts
**Cambios**:
- Agregado logging para `uploadProfilePhoto()`
- Mejor manejo de errores con información clara

## 🚀 Pasos para Hacer Funcionar

### Paso 1: Inicializar Storage (Una sola vez)
```bash
# En un terminal con acceso a tu backend
curl -X POST http://localhost:4000/api/setup/initialize-storage

# Respuesta esperada:
{
  "code": "STORAGE_INITIALIZED",
  "message": "Inicialización de storage completada",
  "results": [
    { "name": "chat-files", "status": "created", "message": "..." },
    { "name": "profile-photos", "status": "created", "message": "..." }
  ]
}
```

**O desde el navegador**:
```
GET http://localhost:4000/api/setup/initialize-storage
```

### Paso 2: Verificar Configuración (Health Check)
```bash
curl http://localhost:4000/api/setup/health

# Respuesta esperada:
{
  "code": "HEALTH_OK",
  "storage": {
    "conectado": true,
    "profilePhotosExiste": true,    # ← Debe ser true
    "profilePhotosPublico": true    # ← Debe ser true
  }
}
```

### Paso 3: Verificar en Supabase Console
1. Abre https://app.supabase.com/
2. Selecciona tu proyecto
3. Ve a **Storage** en el sidebar
4. Verifica que exista el bucket `profile-photos`
5. Haz clic en el bucket y verifica:
   - Public: ✅ ON
   - File size limit: 5MB

### Paso 4: Revisar la Tabla usuarios en BD
1. En Supabase, ve a **SQL Editor**
2. Ejecuta:
```sql
-- Verificar que la columna foto_perfil existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'usuarios' AND column_name = 'foto_perfil';

-- Resultado esperado: foto_perfil, text (o similar)
```

3. Si no existe la columna, créala:
```sql
ALTER TABLE usuarios 
ADD COLUMN foto_perfil TEXT DEFAULT NULL;
```

## 🧪 Pruebas

### Prueba 1: Test de Upload Directo (cURL)
```bash
# Genera una imagen pequeña de prueba
# O usa una imagen que tengas

curl -X PUT \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "foto=@/ruta/a/imagen.jpg" \
  http://localhost:4000/api/auth/profile/photo

# Respuesta esperada:
{
  "message": "Foto de perfil actualizada exitosamente",
  "code": "PHOTO_UPDATED",
  "foto_perfil": "https://..."
}
```

### Prueba 2: Verificar URL Pública
1. Copia la URL de `foto_perfil` de la respuesta anterior
2. Abrela en el navegador
3. **Debe mostrar la imagen** (sin errores 403/404)

### Prueba 3: Test en el Navegador
1. Abre la app web
2. Ve a tu perfil (haz clic en tu foto en la esquina arriba)
3. Haz clic en el botón de cámara (esquina inferior derecha de tu foto)
4. Selecciona una imagen
5. **Debe subirse y mostrarse inmediatamente**

## 🐛 Depuración

### Si falla la carga, revisar estos logs:

#### En el navegador (F12 → Console):
Busca mensajes como:
```
📸 Iniciando carga de foto...
✅ Respuesta del servidor:
❌ Error al subir foto:
```

#### En el servidor (backend logs):
Busca mensajes como:
```
📸 Subiendo foto de perfil para usuario...
✅ Foto subida exitosamente: profiles/...
🔗 URL pública generada: https://...
❌ Error subiendo foto:
```

### Errores comunes:

**Error: "BUCKET_NOT_FOUND"**
- Solución: Ejecuta el Paso 1 (inicializar storage)

**Error: "NO_FILE"**
- Verifica que estés seleccionando un archivo en el input
- Verifica que el input tenga `accept="image/*"`

**Error: "INVALID_FILE_TYPE"**
- Asegúrate de seleccionar una imagen (JPG, PNG, WebP, GIF)

**Error: "FILE_TOO_LARGE"**
- La imagen debe ser menor a 5MB

**Error: "403 Forbidden" al abrir la URL**
- El bucket no está public
- Ve a Supabase → Storage → profile-photos → Editar configuración
- Asegúrate que esté en "Public" mode

**Error: "404 Not Found" al abrir la URL**
- El archivo no se subió correctamente
- Verifica los logs del servidor

**Error: "UPDATE_ERROR"**
- Verifica que la columna `foto_perfil` existe en la tabla `usuarios`
- Verifica que tienes permisos para actualizar esa tabla
- Ejecuta el SQL del Paso 4

## 📱 API Endpoints

### Web (authRoutes):
```
PUT /api/auth/profile/photo
- Autenticación: JWT Bearer
- Body: FormData con campo 'foto'
- Respuesta: { foto_perfil: "https://..." }
```

### Móvil (mobileRoutes):
```
POST /api/mobile/profile/photo
- Autenticación: JWT Bearer (Mobile)
- Body: FormData con campo 'foto'
- Respuesta: { foto_perfil: "https://..." }
```

## 🔄 Flujo Completo de Carga

```
1. Usuario selecciona imagen en navegador
   ↓
2. Frontend valida tipo y tamaño
   ↓
3. Frontend envía FormData a PUT /api/auth/profile/photo
   ↓
4. Backend recibe archivo en req.file
   ↓
5. Backend valida archivo nuevamente
   ↓
6. Backend sube a Supabase Storage (bucket: profile-photos)
   ↓
7. Backend genera URL pública
   ↓
8. Backend actualiza tabla usuarios.foto_perfil con URL
   ↓
9. Backend responde con nueva URL
   ↓
10. Frontend actualiza estado user.foto_perfil
   ↓
11. Componentes re-renderizan con nueva foto
```

## ✨ Verificación Final

Si todo funciona correctamente, deberías ver:
- ✅ Foto cargada en la esquina superior derecha
- ✅ Foto cargada en el dropdown de perfil
- ✅ Foto cargada en la lista de contactos (si aplica)
- ✅ URL pública funciona cuando la copias en el navegador
- ✅ Los logs muestran "✅ Foto de perfil actualizada"

## 📞 Soporte

Si algo no funciona:
1. Revisa los logs del navegador (F12)
2. Revisa los logs del servidor (terminal donde corre tu backend)
3. Ejecuta nuevamente `initialize-storage`
4. Verifica que Supabase está disponible
5. Verifica que los buckets existen en Supabase Console
