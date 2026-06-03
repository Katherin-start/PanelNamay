# 🔧 FIX: Error al Eliminar Pacientes - Incompatibilidad de Tipos

## Problema
El error ocurre porque la tabla `pacientes` está definida con `id` de tipo **INTEGER**, pero se están enviando **UUIDs** desde el frontend.

```
Error: invalid input syntax for type integer: "c0ee2813-a00c-4574-a95d-749f7446f2ef"
```

## Causa Raíz
- La tabla `pacientes` fue creada con `id INTEGER`
- Supabase está generando UUIDs para nuevos pacientes
- PostgreSQL rechaza comparar un UUID con un campo INTEGER

## Solución

### Opción 1: Ejecutar Migración en Supabase (RECOMENDADO)

1. Ve a [Supabase Dashboard](https://app.supabase.com) → Tu Proyecto
2. Abre **SQL Editor** en el menú lateral izquierdo
3. Haz clic en **New Query**
4. Copia y pega el contenido de este archivo: `backend/sql/fix_pacientes_id_type.sql`
5. Revisa que el script esté correcto
6. Haz clic en **Run**

**El script hace lo siguiente:**
- Crea una tabla temporal `pacientes_new` con `id` como UUID
- Copia los datos de `pacientes` a la tabla nueva (convirtiendo IDs si es necesario)
- Renombra las tablas
- Recrea los índices

### Opción 2: Validar que la Migración Funcionó

Después de ejecutar el script, verifica en el SQL Editor:

```sql
-- Verificar que los IDs son ahora UUID
SELECT id, nombre, typeof(id)
FROM pacientes
LIMIT 5;
```

Si ves algo como `uuid` en la columna `typeof(id)`, ¡la migración funcionó!

### Opción 3: Restaurar (si algo sale mal)

Si hay problemas, ejecuta en el SQL Editor:

```sql
ALTER TABLE pacientes RENAME TO pacientes_new;
ALTER TABLE pacientes_old RENAME TO pacientes;
DROP TABLE pacientes_new;
```

## Después de la Migración

1. **Reinicia el servidor backend:**
   ```bash
   npm restart
   # O
   npm stop && npm start
   ```

2. **Recarga la página del navegador**

3. **Intenta eliminar un paciente nuevamente**

## ✅ Testing

Para verificar que funciona:

```bash
# Desde la consola del navegador (F12 → Console):
# Debería completarse sin errores
```

## Posibles Errores Post-Migración

| Error | Solución |
|-------|----------|
| `Violates foreign key constraint` | Ejecuta las migraciones que actualizan las referencias a `pacientes` |
| `Column id doesn't exist` | Verifica que la tabla `pacientes` fue renombrada correctamente |
| `Duplicate id` | Los datos originales tenían IDs duplicados (raro) |

## Notas Técnicas

- **UUIDs**: Mejor para bases de datos distribuidas y seguridad
- **INTEGER**: Mejor para secuencias automáticas y espacio de almacenamiento
- Esta migración elige **UUIDs** porque el sistema ya las está usando en el frontend

## Archivos Relacionados
- Backend: `backend/src/controllers/patientController.js` (ya actualizado)
- Frontend: `frontend/components/patients/PatientsPage.tsx` (ya actualizado)
- SQL: `backend/sql/fix_pacientes_id_type.sql` (migración)
