# SQL para Agregar DNI a Pacientes

Ejecuta este SQL en Supabase > SQL Editor:

```sql
-- Agregar DNI a los pacientes
UPDATE usuarios 
SET dni = '12345678' 
WHERE nombre ILIKE '%zoe%' AND correo ILIKE '%namay%';

UPDATE usuarios 
SET dni = '87654321' 
WHERE nombre ILIKE '%eva%' AND correo ILIKE '%namay%';

UPDATE usuarios 
SET dni = '11111111' 
WHERE nombre ILIKE '%mia%' AND correo ILIKE '%namay%';

UPDATE usuarios 
SET dni = '22222222' 
WHERE nombre ILIKE '%liz%' AND correo ILIKE '%namay%';

UPDATE usuarios 
SET dni = '33333333' 
WHERE nombre ILIKE '%juan%cliente%' AND correo ILIKE '%namay%';

-- Verificar que se actualizaron
SELECT nombre, correo, dni 
FROM usuarios 
WHERE correo ILIKE '%namay%' OR correo ILIKE '%hotmail%'
ORDER BY creado_en DESC;
```

Después de ejecutar:
1. Recarga la página (F5)
2. Ve a Pacientes
3. Deberías ver los DNI en la tabla
