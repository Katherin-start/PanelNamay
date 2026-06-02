# Inicializar Almacenamiento de Fotos de Perfil

## ⚠️ Importante
Para que las fotos de perfil funcionen correctamente, debes inicializar el almacenamiento de Supabase. Sigue estos pasos:

## 📝 Pasos de Inicialización

### 1️⃣ Llamar al endpoint de inicialización

Ejecuta esto en tu navegador (abre la consola de desenvolvedor y copia-pega):

```javascript
fetch('http://localhost:4000/api/setup/initialize-storage', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log(data))
```

O si tienes cURL:
```bash
curl -X POST http://localhost:4000/api/setup/initialize-storage \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

### 2️⃣ Verificar que funcionó

```javascript
fetch('http://localhost:4000/api/setup/health', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(data => console.log(data))
```

Busca en la respuesta:
- ✅ `"profilePhotosExiste": true`
- ✅ `"profilePhotosPublico": true`

## ✨ Ahora Funciona

Una vez inicializado, los usuarios pueden:

1. **Hacer clic** en el avatar en la esquina superior derecha (topbar)
2. **Hacer clic** en el icono de cámara (pequeño ícono en la esquina del avatar)
3. **Seleccionar** una imagen desde su dispositivo (máximo 5MB)
4. **Ver** cómo la foto se actualiza automáticamente

## 🐛 Si Las Fotos No Se Muestran

1. Verifica que el bucket `profile-photos` esté creado:
   - Ve a Supabase Dashboard > Storage > Buckets
   - Deberías ver `profile-photos` con acceso público

2. Verifica que la columna `foto_perfil` existe en la tabla `usuarios`:
   - Ve a Supabase > SQL Editor > ejecuta:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name='usuarios' AND column_name='foto_perfil';
   ```

3. Si la columna no existe, agrégala:
   ```sql
   ALTER TABLE usuarios ADD COLUMN foto_perfil TEXT;
   ```

## 🔧 Verificación Completa

Ejecuta este SQL en Supabase:
```sql
-- Ver si el bucket existe
SELECT name, public, file_size_limit FROM storage.buckets 
WHERE name = 'profile-photos';

-- Ver si hay fotos guardadas
SELECT name, owner, created_at FROM storage.objects 
WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = 'profile-photos')
LIMIT 10;
```

## 📸 Cambios Recientes

✅ **Nuevas funcionalidades agregadas:**
- Botón "Eliminar" en la tabla de pacientes
- Modal de confirmación antes de eliminar pacientes
- Fotos de perfil ahora se muestran en el directorio de pacientes
- Si el paciente no tiene foto, muestra iniciales

## 🚀 Para Desarrolladores

Si necesitas actualizar la foto de un usuario programáticamente:

```javascript
const formData = new FormData();
formData.append('file', imageFile); // un File objeto

const response = await fetch('/api/auth/profile/photo', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const data = await response.json();
console.log(data.foto_perfil); // URL de la foto
```

---

**¿Necesitas ayuda?** Revisa los logs del servidor con `console.log()` en el navegador y del backend.
