# 🔧 Guía de Testing: Notificaciones CAJERO desde App Móvil

## 📋 Resumen de Cambios

Se han implementado **3 mejoras principales** para que el CAJERO reciba notificaciones de citas desde la app móvil:

| Cambio | Descripción | Beneficio |
|--------|-------------|-----------|
| 🔍 **Búsqueda de Roles Mejorada** | `resolveRoleId()` busca de múltiples formas | Encuentra el rol incluso si el nombre tiene variaciones |
| 🎯 **Salas por Rol en Socket.IO** | Usuarios se unen a `role_CAJERO`, `role_RECEPCIONISTA` | Notificación más eficiente a todos los del rol |
| 🧪 **Endpoints de Diagnóstico** | Nuevas rutas para testear la funcionalidad | Debugging fácil sin tocar código |

---

## ✅ Paso 1: Verificar Roles en la Base de Datos

### Ejecutar:
```bash
curl http://localhost:3000/api/mobile/diagnostic/roles
```

### Respuesta Esperada:
```json
{
  "code": "DIAGNOSTIC_SUCCESS",
  "diagnostics": {
    "roles_en_bd": [
      { "id": 1, "nombre": "ADMIN" },
      { "id": 2, "nombre": "ODONTOLOGO" },
      { "id": 3, "nombre": "CAJERO" },
      { "id": 4, "nombre": "RECEPCIONISTA" },
      { "id": 5, "nombre": "ASISTENTE" },
      { "id": 6, "nombre": "PACIENTE" }
    ],
    "roles_buscados": {
      "cajero": { "id": 3, "nombre": "CAJERO" },
      "recepcionista": { "id": 4, "nombre": "RECEPCIONISTA" }
    },
    "usuarios_por_rol": {
      "CAJERO": {
        "total": 2,
        "activos": 2,
        "usuarios": [
          { "id": "uuid-1", "nombre": "Juan", "correo": "juan@example.com", "activo": true },
          { "id": "uuid-2", "nombre": "María", "correo": "maria@example.com", "activo": true }
        ]
      },
      "RECEPCIONISTA": { ... }
    }
  }
}
```

### ⚠️ Si Falla:
- **"CAJERO rol NO encontrado"**: Revisar que el rol exista en la tabla `roles` de Supabase
- **"No hay usuarios activos para CAJERO"**: Los usuarios CAJERO están marcados como `activo=false`

---

## ✅ Paso 2: Probar Notificación de Prueba

### Ejecutar:
```bash
curl -X POST http://localhost:3000/api/mobile/diagnostic/test-notification \
  -H "Content-Type: application/json" \
  -d '{"roleName": "CAJERO", "event": "test_event"}'
```

### Respuesta Esperada:
```json
{
  "code": "TEST_NOTIFICATION_SENT",
  "roleName": "CAJERO",
  "event": "test_event",
  "success": true,
  "payload": {
    "test": true,
    "message": "Notificación de prueba para CAJERO",
    "timestamp": "2026-06-13T10:30:45.123Z"
  }
}
```

### Logs del Backend Esperados:
```
🧪 [testNotification] Probando notificación para rol: "CAJERO"
🔍 [resolveRoleId] Buscando rol: "CAJERO"
✅ [resolveRoleId] Rol encontrado: CAJERO (ID: 3)
👥 [notifyUsersByRole] Encontrados 2 usuario(s) para CAJERO:
  - Juan (juan@example.com) [uuid-1]
  - María (maria@example.com) [uuid-2]
📤 [notifyUsersByRole] Emitiendo a sala de rol: role_CAJERO
✅ [notifyUsersByRole] 1/3 notificación(es) enviada(s)...
```

---

## ✅ Paso 3: Conectar Usuario CAJERO al Socket.IO

**Importante**: Los usuarios deben estar conectados al Socket.IO para recibir notificaciones.

### En el Frontend (dashboard):

```javascript
// En tu componente principal (ej: DashboardLayout.tsx)
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';

let socket: Socket | null = null;

export default function DashboardLayout() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    // Conectar al Socket.IO del backend
    socket = io('http://localhost:3000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // 🎯 IMPORTANTE: Emitir evento 'join' para agregar a salas
    socket.emit('join', user.id);
    console.log(`✅ Socket.IO conectado para usuario: ${user.id}`);

    // 📢 Escuchar notificaciones de citas
    socket.on('new_mobile_appointment', (data) => {
      console.log('📬 Nueva cita desde móvil:', data);
      // TODO: Mostrar notificación visual, actualizar lista de citas, etc.
    });

    // 📢 Escuchar cambios de estado de cita
    socket.on('appointment_status_changed', (data) => {
      console.log('📝 Estado de cita actualizado:', data);
    });

    // 📬 Escuchar comprobantes de pago
    socket.on('payment_proof_uploaded', (data) => {
      console.log('💳 Nuevo comprobante de pago:', data);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user?.id]);

  return (
    // ... tu JSX
  );
}
```

### Logs Esperados del Frontend:
```
✅ Socket.IO conectado para usuario: abc-123-def
📬 Nueva cita desde móvil: { appointment: {...}, payment: {...} }
```

---

## ✅ Paso 4: Crear Cita desde App Móvil

1. Abre la app móvil Flutter
2. Inicia sesión como PACIENTE
3. Selecciona un ODONTÓLOGO
4. Elige fecha y hora
5. Ingresa monto de pago
6. Completa la cita

### Verificación:

**En el backend (logs):**
```
🔵 [createMobileAppointment] Iniciando creación de cita móvil
📝 [createMobileAppointment] Body recibido: {...}
👤 [createMobileAppointment] User autenticado: ID: paciente-uuid

✅ [createMobileAppointment] Rol ID resuelto: 3
👥 [notifyUsersByRole] Encontrados 2 usuario(s) para CAJERO
📤 [notifyUsersByRole] Emitiendo a sala de rol: role_CAJERO
✅ [createMobileAppointment] Al menos una notificación fue enviada correctamente
```

**En el dashboard CAJERO:**
```
📬 Nueva cita desde móvil: {
  appointment: { id, fecha, hora, id_odontologo, ... },
  payment: { id, monto, metodo_pago, estado, ... }
}
```

---

## 🔍 Checklist de Debugging

| Paso | Verificación | Estado |
|------|-------------|--------|
| 1️⃣ | Rol CAJERO existe en BD | ✅/❌ |
| 2️⃣ | Usuarios CAJERO activos existen | ✅/❌ |
| 3️⃣ | Notificación de prueba se envía | ✅/❌ |
| 4️⃣ | Usuario CAJERO conectado a Socket.IO | ✅/❌ |
| 5️⃣ | Evento `join` se emite correctamente | ✅/❌ |
| 6️⃣ | Cita se crea desde móvil sin errores | ✅/❌ |
| 7️⃣ | CAJERO recibe notificación en dashboard | ✅/❌ |

---

## 🆘 Solución de Problemas

### ❌ Error: "CAJERO rol NO encontrado"
**Solución:**
1. Verificar en Supabase que existe fila en tabla `roles` con nombre = "CAJERO"
2. Si está como "Cajero" o "cajero", renombrar a "CAJERO"
3. Si no existe, crear:
   ```sql
   INSERT INTO roles (nombre) VALUES ('CAJERO');
   ```

### ❌ Error: "No hay usuarios activos para CAJERO"
**Solución:**
1. Verificar en Supabase tabla `usuarios`
2. Cambiar campo `activo = true` para usuarios con `rol_id` de CAJERO
3. O crear un usuario CAJERO de prueba si no existe

### ❌ Socket.IO recibe notificación pero no aparece en frontend
**Solución:**
1. Verificar que `socket.emit('join', user.id)` se ejecutó
2. Revisar que escuchadores se registraron: `socket.on('new_mobile_appointment', ...)`
3. Abrir DevTools > Console para ver errores JavaScript
4. Abrir DevTools > Network para ver conexión Socket.IO

### ❌ Cita se crea pero CAJERO no recibe notificación
**Solución:**
1. Ejecutar `/diagnostic/test-notification` para verificar que la función funciona
2. Revisar logs del backend (mensaje "Notificaciones enviadas correctamente")
3. Verificar que CAJERO está conectado al Socket.IO
4. Revisar que no hay firewall/proxy bloqueando WebSocket

---

## 📞 Información de Contacto

Si algún paso falla:
1. 📋 Ejecuta `/diagnostic/roles` y comparte el JSON completo
2. 📊 Ejecuta `/diagnostic/test-notification` y comparte respuesta
3. 📝 Abre DevTools del navegador en pestaña Console y copia errores
4. 🖥️ Comparte los logs del backend (primeras 100 líneas)

---

## Cambios en el Código

### ✅ Archivo: `backend/src/controllers/mobileController.js`
- **Función mejorada**: `resolveRoleId()` - Búsqueda exhaustiva de roles
- **Función mejorada**: `notifyUsersByRole()` - Notificación dual (sala + fallback)
- **Nuevas funciones**: `diagnosticRoles()`, `testNotification()`

### ✅ Archivo: `backend/src/socket/chatSocket.js`
- **Evento mejorado**: `join` - Ahora agrega a sala de rol automáticamente

### ✅ Archivo: `backend/src/routes/mobileRoutes.js`
- **Nuevas rutas**: `/diagnostic/roles`, `/diagnostic/test-notification`

---

**Última actualización**: 2026-06-13 ✅
