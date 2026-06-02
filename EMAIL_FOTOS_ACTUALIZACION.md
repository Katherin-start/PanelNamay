# Mostrar Email y Fotos de Perfil en Directorio de Pacientes

## ✅ Cambios Realizados

1. **Backend (`patientController.js`):**
   - Ahora retorna `foto_perfil` en el SELECT de pacientes
   - Cambio: `SELECT 'id, nombre, dni, telefono, estado, created_at, foto_perfil'`

2. **Frontend (`PatientsPage.tsx`):**
   - Cambio: Columna de "Teléfono" → "Correo Electrónico"
   - Nuevo icono: `EnvelopeIcon` (sobre) en lugar de `PhoneIcon`
   - Ahora muestra `patient.email` en lugar de `patient.telefono`

3. **Frontend (`lib/api.ts`):**
   - Normalizer ahora maneja `foto_perfil` correctamente

## 🔧 Si Deseas Usar la Tabla `pacientes` Directamente

Si quieres que los pacientes de la tabla `pacientes` tengan email y fotos, ejecuta este SQL en Supabase:

```sql
-- Agregar columnas a tabla pacientes si no existen
ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS correo TEXT,
ADD COLUMN IF NOT EXISTS foto_perfil TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Verificar que las columnas existan
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pacientes' 
ORDER BY ordinal_position;
```

## 🎯 Cómo Funciona Ahora

### Opción 1: Pacientes desde tabla `usuarios` (RECOMENDADO)
- Sistema trae pacientes filtrando usuarios con rol "paciente"
- ✅ Email disponible
- ✅ Fotos disponibles
- ✅ Más completo

### Opción 2: Pacientes desde tabla `pacientes`
- Si la tabla tiene columnas `correo` y `foto_perfil`
- ✅ Email mostrado
- ✅ Fotos mostradas
- ⚠️ Requiere las columnas agregadas

## 📝 Nota Importante

Actualmente, la tabla `pacientes` probablemente tiene:
- ✅ id, nombre, dni, telefono, estado, created_at, foto_perfil (ahora agregado)
- ❌ email/correo (podría no existir)

Si quieres que cada paciente tenga su propio email en la tabla `pacientes`, ejecuta el SQL anterior.

## 🔄 Si Aún No Ves Fotos

1. Asegúrate que inicializaste el storage:
   ```javascript
   fetch('http://localhost:4000/api/setup/initialize-storage', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${localStorage.getItem('token')}`,
       'Content-Type': 'application/json'
     }
   }).then(r => r.json()).then(console.log)
   ```

2. Verifica que los usuarios tengan fotos cargadas:
   - Click en perfil dropdown
   - Click en icono de cámara
   - Selecciona una imagen

3. Recarga la página para ver los cambios

## 📊 Estructura Actual de Datos

```
getUsers() → usuarios tabla
├── id
├── nombre
├── correo ✅
├── foto_perfil ✅
└── rol (filter: 'paciente')

getPatients() → pacientes tabla
├── id
├── nombre
├── dni
├── telefono
├── estado
├── created_at
├── foto_perfil ✅ (ahora retornado)
└── correo/email (opcional, podría agregarse)
```

---

**¿Qué tipo de datos usando?** Si los pacientes vienen de la tabla `usuarios`, está todo listo. Si vienen de tabla `pacientes`, podrías ejecutar el SQL para agregar las columnas faltantes.
