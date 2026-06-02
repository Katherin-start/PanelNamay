# ⚡ INSTRUCCIONES RÁPIDAS - Carga de Fotos de Perfil

## El problema y la solución

**Problema**: Las fotos de perfil no se cargan, no se almacenan ni se ven.

**Causa**: El bucket `profile-photos` en Supabase no estaba siendo creado automáticamente.

**Solución**: Ya implementé la solución. Ahora solo necesitas hacer esto:

---

## 🚀 3 pasos para que funcione:

### 1️⃣ Ejecutar la inicialización (UNA SOLA VEZ)

Desde tu terminal (mientras tu backend esté corriendo):

```bash
curl -X POST http://localhost:4000/api/setup/initialize-storage
```

**Respuesta esperada**:
```json
{
  "code": "STORAGE_INITIALIZED",
  "results": [
    { "name": "chat-files", "status": "created" },
    { "name": "profile-photos", "status": "created" }
  ]
}
```

### 2️⃣ Verificar que todo esté bien

```bash
curl http://localhost:4000/api/setup/health
```

**Busca estas líneas en la respuesta**:
```
"profilePhotosExiste": true,
"profilePhotosPublico": true
```

Si ambos son `true`, ¡estás listo!

### 3️⃣ Probar en tu aplicación

1. Abre la app web
2. Haz clic en tu avatar en la esquina superior derecha
3. Haz clic en el botón de cámara (círculo blanco con ícono de cámara)
4. Selecciona una foto
5. **La foto debe subirse y mostrarse inmediatamente** ✅

---

## 📝 Lo que cambié en el código

### Backend
- ✅ `setupController.js`: Ahora crea el bucket `profile-photos` automáticamente
- ✅ `authController.js`: Mejorado el upload de fotos con mejor logging
- ✅ `mobileController.js`: Mismas mejoras para la API móvil

### Frontend
- ✅ `DashboardLayout.tsx`: Mejor manejo de errores
- ✅ `api.ts`: Agregado logging detallado

---

## 🔍 Si algo no funciona

### Revisa estos logs

**En tu navegador (F12 → Console)**:
```
📸 Iniciando carga de foto...
✅ Respuesta del servidor:
```

**En la terminal de tu backend**:
```
✅ Foto subida exitosamente: profiles/...
🔗 URL pública generada: https://...
```

### Errores comunes:

| Error | Solución |
|-------|----------|
| `"BUCKET_NOT_FOUND"` | Ejecuta el paso 1 nuevamente |
| `"NO_FILE"` | Asegúrate de seleccionar un archivo |
| `"FILE_TOO_LARGE"` | La imagen debe ser menor a 5MB |
| `"403 Forbidden"` al ver la foto | Ve a Supabase → Storage → profile-photos → cambiar a "Public" |
| `"404 Not Found"` | El bucket no existe en Supabase |

---

## 📋 Verificación en Supabase

1. Abre https://app.supabase.com/
2. Selecciona tu proyecto
3. Ve a **Storage**
4. Verifica que exista `profile-photos` (junto a `chat-files`)
5. Haz clic en `profile-photos` y verifica:
   - **Public**: ✅ Activado
   - **File size limit**: 5MB

---

## ✅ Si todo funciona correctamente

Deberías ver:
- ✅ Tu foto en la esquina superior derecha
- ✅ Tu foto en el dropdown de perfil
- ✅ Tu foto en la lista de contactos del chat
- ✅ Los logs muestran "✅ Foto de perfil actualizada"

---

## 📖 Documentación completa

Para más detalles, lee `PROFILE_PHOTO_FIX.md` en la raíz del proyecto.
Incluye:
- Flujo completo de carga
- Ejemplos con cURL
- Troubleshooting avanzado
- Verificación de base de datos
