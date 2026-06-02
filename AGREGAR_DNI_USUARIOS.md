# Agregar DNI a Tabla Usuarios

## 🔧 Solución: Ejecutar SQL en Supabase

### Paso 1: Abrir SQL Editor en Supabase

1. Ve a tu proyecto en Supabase
2. Click en **SQL Editor** (lado izquierdo)
3. Click en **+ New Query**

### Paso 2: Agregar Columna DNI

Copia y pega este SQL:

```sql
-- Agregar columna dni a tabla usuarios si no existe
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS dni TEXT DEFAULT '';

-- Verificar que la columna fue creada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'usuarios' 
ORDER BY ordinal_position;
```

Luego haz click en **Run** o presiona `Ctrl+Enter`.

### Paso 3: Agregar Datos de Ejemplo (OPCIONAL)

Si quieres agregar DNIs para las pacientes existentes:

```sql
-- Actualizar con datos de ejemplo
UPDATE usuarios SET dni = '12345678' WHERE nombre = 'Zoe';
UPDATE usuarios SET dni = '87654321' WHERE nombre = 'Eva';
UPDATE usuarios SET dni = '11111111' WHERE nombre = 'Mia';
UPDATE usuarios SET dni = '22222222' WHERE nombre = 'Liz';
UPDATE usuarios SET dni = '33333333' WHERE nombre = 'Juan Cliente';
```

### Paso 4: Verificar

```sql
-- Ver todos los usuarios con DNI
SELECT id, nombre, correo, dni, activo 
FROM usuarios 
WHERE rol_id = (SELECT id FROM roles WHERE nombre = 'PACIENTE')
ORDER BY creado_en DESC;
```

### Paso 5: Recargar la Aplicación

1. Recarga el navegador (F5 o Ctrl+R)
2. Ve a **Pacientes**
3. Ahora deberías ver los DNIs

## ❓ Si Aún No Ve el DNI

### Opción A: Verificar Que la Columna Existe

```sql
-- Ver estructura de tabla usuarios
\d usuarios

-- O ver columnas específicamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'usuarios' 
AND column_name = 'dni';
```

### Opción B: Editar un Usuario Manualmente

1. Ve a Supabase > **Table Editor**
2. Abre tabla `usuarios`
3. Encuentra a "Zoe" 
4. Edita la columna `dni` y agrega un valor (ej: "12345678")
5. Recarga la app

### Opción C: Usar Formulario de Frontend (Si está disponible)

Si hay un formulario para editar usuarios, puedes agregar el DNI ahí directamente.

---

## 🚀 Después de Esto

El directorio de pacientes mostrará:
- ✅ Nombre del paciente
- ✅ **DNI** (ya no mostrará "No registrado")
- ✅ Email
- ✅ Foto de perfil
- ✅ Fecha de registro
- ✅ Estado (Activo/Inactivo)

---

## 📝 Nota Importante

- La columna `dni` es TEXT, puedes guardar valores alfanuméricos
- Si dejas algún DNI vacío, mostrará "No registrado" como fallback
- Los cambios se reflejan inmediatamente en la app

**¿Necesitas ayuda?** Ejecuta el primer SQL y déjame saber si aparece la columna.
