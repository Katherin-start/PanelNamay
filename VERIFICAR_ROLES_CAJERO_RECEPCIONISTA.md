# 🔍 Verificar Mapeo de Roles - CAJERO y RECEPCIONISTA

## Problema
Las notificaciones de nuevas citas no llegan a CAJERO ni RECEPCIONISTA porque probablemente:
1. Los nombres de los roles en la BD son diferentes
2. Los usuarios no tienen el `rol_id` correcto asignado
3. Hay un mismatch entre nombre de rol e ID

## Solución: Verificar Configuración

### 1️⃣ Ver todos los roles en la base de datos

```sql
-- Listar todos los roles disponibles
SELECT id, nombre FROM roles ORDER BY id;
```

**Posibles resultados:**
```
id | nombre
---+------------------
1  | ADMIN
2  | ODONTOLOGO
3  | CAJERO
4  | RECEPCIONISTA
5  | PACIENTE
6  | OTRO
```

⚠️ **NOTA:** Si los nombres están en minúsculas como `cajero` o `recepcionista`, o con espacios extras, será necesario normalizar.

---

### 2️⃣ Ver cuántos usuarios CAJERO hay

```sql
-- Contar usuarios con rol CAJERO
SELECT COUNT(*) as total_cajeros
FROM usuarios
WHERE rol_id = (SELECT id FROM roles WHERE nombre = 'CAJERO')
  AND activo = true;

-- Ver detalles
SELECT id, nombre, correo, rol_id, activo
FROM usuarios
WHERE rol_id = (SELECT id FROM roles WHERE nombre = 'CAJERO')
  AND activo = true;
```

---

### 3️⃣ Ver cuántos usuarios RECEPCIONISTA hay

```sql
-- Contar usuarios con rol RECEPCIONISTA
SELECT COUNT(*) as total_recepcionistas
FROM usuarios
WHERE rol_id = (SELECT id FROM roles WHERE nombre = 'RECEPCIONISTA')
  AND activo = true;

-- Ver detalles
SELECT id, nombre, correo, rol_id, activo
FROM usuarios
WHERE rol_id = (SELECT id FROM roles WHERE nombre = 'RECEPCIONISTA')
  AND activo = true;
```

---

### 4️⃣ Verificar que los roles son accesibles

```sql
-- Verificar relación usuarios-roles
SELECT u.id, u.nombre, u.correo, u.rol_id, r.nombre as rol_nombre, u.activo
FROM usuarios u
LEFT JOIN roles r ON u.rol_id = r.id
WHERE u.rol_id IN (
  SELECT id FROM roles WHERE nombre IN ('CAJERO', 'RECEPCIONISTA')
)
AND u.activo = true;
```

---

## 🛠️ Si el Mapeo está Mal

### Caso 1: Los roles tienen nombres diferentes (ej: minúsculas)

**Solución:** Actualizar tabla `roles`

```sql
-- Normalizar a MAYÚSCULAS
UPDATE roles 
SET nombre = UPPER(nombre) 
WHERE nombre IN ('cajero', 'recepcionista', 'odontologo', 'paciente', 'admin');

SELECT * FROM roles;
```

---

### Caso 2: Los usuarios no tienen `rol_id` correcto

**Solución:** Asignar rol_id correcto

```sql
-- Verificar primero qué rol_id corresponde a CAJERO
SELECT id FROM roles WHERE nombre = 'CAJERO';
-- Resultado: 3 (o el que sea)

-- Luego actualizar usuarios (ej: Ruben es CAJERO)
UPDATE usuarios 
SET rol_id = 3  -- ID del rol CAJERO
WHERE correo = 'ruben@namay.com';

-- Verificar que se actualizó
SELECT id, nombre, correo, rol_id FROM usuarios WHERE correo = 'ruben@namay.com';
```

---

### Caso 3: Hay roles duplicados o malformados

**Solución:** Limpiar roles

```sql
-- Ver si hay duplicados
SELECT nombre, COUNT(*) 
FROM roles 
GROUP BY nombre 
HAVING COUNT(*) > 1;

-- Si hay, eliminar duplicados (cuidado: verificar que no hay FKs)
DELETE FROM roles 
WHERE id NOT IN (
  SELECT MAX(id) FROM roles GROUP BY nombre
);
```

---

## 📋 Checklist

- [ ] Ejecuté: `SELECT id, nombre FROM roles;`
- [ ] Confirmé que existen roles: `CAJERO`, `RECEPCIONISTA`
- [ ] Ejecuté: `SELECT COUNT(*) FROM usuarios WHERE rol_id = (SELECT id FROM roles WHERE nombre = 'CAJERO');`
- [ ] Confirmé que hay usuarios CAJERO activos
- [ ] Ejecuté: `SELECT COUNT(*) FROM usuarios WHERE rol_id = (SELECT id FROM roles WHERE nombre = 'RECEPCIONISTA');`
- [ ] Confirmé que hay usuarios RECEPCIONISTA activos
- [ ] Si faltaban usuarios, los asigné con UPDATE rol_id

---

## 🔧 Testing Después de Corregir

### En el código backend, los logs ahora mostrarán:

1. **Si el rol se encuentra:**
   ```
   🔍 [resolveRoleId] Buscando rol: "CAJERO"
   ✅ [resolveRoleId] Rol encontrado: CAJERO (ID: 3)
   👥 [notifyUsersByRole] Encontrados 1 usuario(s) para CAJERO:
     - Ruben (ruben@namay.com) [uuid-123]
   📤 [notifyUsersByRole] Emitiendo a room: user_uuid-123
   ✅ [notifyUsersByRole] 1 notificación(es) enviada(s)
   ```

2. **Si el rol NO se encuentra:**
   ```
   🔍 [resolveRoleId] Buscando rol: "CAJERO"
   ❌ [resolveRoleId] Rol "CAJERO" NO encontrado.
   📋 Roles disponibles en BD: ADMIN (1), ODONTOLOGO (2), PACIENTE (6), ...
   ```

---

## 📝 Notas

- Los nombres de los roles deben coincidir exactamente (case-sensitive con ILIKE, pero mejor si están normalizados)
- Los usuarios deben estar activos (`activo = true`)
- La tabla `roles` debe tener las columnas: `id`, `nombre`
- Cada usuario debe tener un `rol_id` válido que referencia a `roles.id`

---

## 🎯 Próximos Pasos

1. ✅ Ejecuta los queries SQL arriba
2. ✅ Confirma qué roles existen y cómo se llaman
3. ✅ Verifica que CAJERO y RECEPCIONISTA tienen usuarios activos
4. ✅ Si hay problema, ejecuta los UPDATE correspondientes
5. ✅ **Reinicia el backend** para que cargue los cambios
6. ✅ Crea una nueva cita desde la app y verifica los logs en la terminal del backend

---

## 🐛 Debugging en Terminal Backend

Para ver los logs en tiempo real:

```bash
# En la carpeta backend/
npm start
```

Cuando se cree una nueva cita, deberías ver:

```
🔵 [createMobileAppointment] Iniciando creación de cita móvil
...
🔔 [createMobileAppointment] Enviando notificaciones de nueva cita...
🔍 [resolveRoleId] Buscando rol: "CAJERO"
✅ [resolveRoleId] Rol encontrado: CAJERO (ID: 3)
👥 [notifyUsersByRole] Encontrados 1 usuario(s) para CAJERO:
  - Ruben (ruben@namay.com) [uuid-123]
📤 [notifyUsersByRole] Emitiendo a room: user_uuid-123
✅ [notifyUsersByRole] 1 notificación(es) enviada(s)
✅ [createMobileAppointment] Notificaciones enviadas correctamente
```

Si ves `❌ [resolveRoleId] Rol "CAJERO" NO encontrado`, entonces hay que ejecutar los queries SQL para verificar y corregir el mapeo.
