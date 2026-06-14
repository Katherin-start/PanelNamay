# 🏥 Guía de Notificaciones en Tiempo Real - App Flutter

## 📱 Socket.IO Events - App Móvil Flutter

La app Flutter debe escuchar estos eventos en tiempo real. El servidor emite eventos a través de Socket.IO cuando ocurren cambios.

---

## 🔔 Eventos Importantes

### 1️⃣ Cita Confirmada por Doctor
**Evento:** `appointment_status_changed`
**Cuándo:** Cuando el doctor (odontólogo) confirma o actualiza el estado de la cita

**Payload:**
```json
{
  "appointmentId": 123,
  "status": "confirmada",
  "doctor": "Dr. Juan Pérez",
  "fecha": "2026-06-20",
  "hora": "10:00",
  "message": "Tu cita ha sido confirmada",
  "timestamp": "2026-06-13T10:30:00Z"
}
```

**Estados posibles:**
- `confirmada` - Doctor confirmó la cita
- `en_curso` - Doctor está haciendo la cita
- `completada` - Cita finalizada
- `cancelada` - Cita cancelada

**Implementación en Flutter:**
```dart
// En tu socket listener
socket.on('appointment_status_changed', (data) {
  print('📍 Cita actualizada: ${data['status']}');
  print('👨‍⚕️ Doctor: ${data['doctor']}');
  print('📅 Fecha: ${data['fecha']} ${data['hora']}');
  print('💬 Mensaje: ${data['message']}');
  
  // Actualizar UI
  showNotification(
    title: 'Cita ${data['status']}',
    body: data['message'],
  );
  
  // Refrescar lista de citas
  refreshAppointments();
});
```

---

### 2️⃣ Comprobante de Pago Subido
**Evento:** `payment_proof_uploaded`
**Cuándo:** Cuando un comprobante de pago es subido por el paciente

**Payload:**
```json
{
  "payment": {
    "id": 45,
    "monto": 100.00,
    "metodo_pago": "Yape",
    "comprobante": "https://...",
    "estado_validacion": "POR_CONFIRMAR"
  }
}
```

**Implementación en Flutter:**
```dart
socket.on('payment_proof_uploaded', (data) {
  print('✅ Comprobante subido');
  print('Monto: ${data['payment']['monto']}');
  print('Estado: ${data['payment']['estado_validacion']}');
  
  showNotification(
    title: 'Comprobante recibido',
    body: 'Tu comprobante está siendo validado',
  );
});
```

---

### 3️⃣ Nueva Cita desde App
**Evento:** `new_mobile_appointment`
**Cuándo:** Cuando se crea una nueva cita desde app móvil

**Payload:**
```json
{
  "appointment": {
    "id": 123,
    "fecha": "2026-06-20",
    "hora": "10:00",
    "estado": "pendiente"
  },
  "payment": {
    "id": 45,
    "monto": 100.00,
    "estado": "pendiente"
  }
}
```

---

## 🔗 Endpoints Móviles para Doctor/Odontólogo

### Ver mis citas asignadas
```
GET /api/mobile/appointments/doctor/my
Authorization: Bearer <token_doctor>
```

**Respuesta:**
```json
{
  "code": "DOCTOR_APPOINTMENTS_SUCCESS",
  "appointments": [
    {
      "id": 123,
      "fecha": "2026-06-20",
      "hora": "10:00",
      "estado": "pendiente",
      "pacientes_uuid": {
        "nombre": "Juan",
        "apellido": "Pérez",
        "correo": "juan@example.com",
        "foto_perfil": "https://..."
      },
      "pagos": [
        {
          "id": 45,
          "monto": 100.00,
          "estado": "pendiente",
          "estado_validacion": "POR_CONFIRMAR",
          "comprobante": "https://..."
        }
      ]
    }
  ]
}
```

**Implementación en Flutter:**
```dart
Future<List<Appointment>> getMyAppointments() async {
  final response = await http.get(
    Uri.parse('http://10.0.2.2:4000/api/mobile/appointments/doctor/my'),
    headers: {'Authorization': 'Bearer $token'},
  );
  
  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    return (data['appointments'] as List)
        .map((a) => Appointment.fromJson(a))
        .toList();
  } else {
    throw Exception('Error al cargar citas');
  }
}
```

---

### Confirmar cita (Doctor)
```
PUT /api/mobile/appointments/:appointmentId/confirm
Authorization: Bearer <token_doctor>

Body:
{
  "estado": "confirmada"
}
```

**Valores de estado:**
- `confirmada` - Confirmar cita
- `en_curso` - Iniciar cita
- `completada` - Finalizar cita
- `cancelada` - Cancelar cita

**Respuesta:**
```json
{
  "code": "APPOINTMENT_CONFIRMED",
  "appointment": {
    "id": 123,
    "estado": "confirmada",
    "actualizado_en": "2026-06-13T10:30:00Z"
  },
  "notification_sent": true
}
```

**Implementación en Flutter:**
```dart
Future<void> confirmAppointment(int appointmentId) async {
  final response = await http.put(
    Uri.parse('http://10.0.2.2:4000/api/mobile/appointments/$appointmentId/confirm'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
    body: jsonEncode({'estado': 'confirmada'}),
  );
  
  if (response.statusCode == 200) {
    print('✅ Cita confirmada');
    // El paciente recibirá notificación automática
  } else {
    throw Exception('Error confirmando cita');
  }
}
```

---

## 🎯 Flujo Completo

### Paciente
1. **Crea cita desde app** → Selecciona odontólogo + fecha + monto
2. **Sistema crea pago pendiente**
3. **Paciente sube comprobante** (Yape/Efectivo)
4. **Evento Socket.IO:** `payment_proof_uploaded` enviado a CAJERO/RECEPCIONISTA
5. **CAJERO valida comprobante** en dashboard web

### Doctor/Odontólogo
1. **Abre app móvil** → Ve sus citas asignadas (GET `/appointments/doctor/my`)
2. **Ve comprobante de pago** subido por paciente
3. **Confirma cita** (PUT `/appointments/:id/confirm` con estado `confirmada`)
4. **Evento Socket.IO:** `appointment_status_changed` enviado al PACIENTE
5. **Paciente recibe notificación** en tiempo real

---

## 🔌 Configuración Socket.IO en Flutter

**Ejemplo básico:**
```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class AppointmentService {
  late IO.Socket socket;
  
  void initSocket(String token, String userId) {
    socket = IO.io(
      'http://10.0.2.2:4000',
      IO.OptionBuilder()
        .setTransports(['websocket'])
        .disableAutoConnect()
        .build(),
    );
    
    socket.connect();
    
    socket.on('connect', (_) {
      print('✅ Socket conectado');
      socket.emit('join', userId);
    });
    
    socket.on('appointment_status_changed', (data) {
      print('📍 Cita actualizada: ${data['status']}');
      _handleAppointmentUpdate(data);
    });
    
    socket.on('disconnect', (_) {
      print('❌ Socket desconectado');
    });
  }
  
  void _handleAppointmentUpdate(Map<String, dynamic> data) {
    // Mostrar notificación
    // Actualizar lista de citas
    // Refrescar UI
  }
  
  void dispose() {
    socket.disconnect();
  }
}
```

---

## ⚠️ Notas Importantes

1. **IP del backend:** En emulador Android, usa `10.0.2.2` en lugar de `localhost`
2. **Puerto:** Backend corre en `4000` (por defecto)
3. **Token:** Incluye siempre el token JWT en headers
4. **Socket room:** El servidor emite a `user_${userId}`, asegúrate de hacer `socket.emit('join', userId)` al conectar
5. **Reconexión:** Implementa lógica de reconexión automática en caso de desconexión
6. **Notificaciones:** Usa Firebase Cloud Messaging (FCM) o similar para notificaciones push cuando app está en background

---

## 🧪 Testing

**Curl para confirmar cita:**
```bash
curl -X PUT http://localhost:4000/api/mobile/appointments/123/confirm \
  -H "Authorization: Bearer <token_doctor>" \
  -H "Content-Type: application/json" \
  -d '{"estado": "confirmada"}'
```

**Ver mis citas como doctor:**
```bash
curl -X GET http://localhost:4000/api/mobile/appointments/doctor/my \
  -H "Authorization: Bearer <token_doctor>"
```

---

## 📋 Checklist de Integración

- [ ] Importar `socket_io_client` en `pubspec.yaml`
- [ ] Crear servicio para Socket.IO
- [ ] Escuchar evento `appointment_status_changed`
- [ ] Implementar método `getMyAppointments()` para doctor
- [ ] Implementar método `confirmAppointment()` para doctor
- [ ] Mostrar notificación cuando evento llega
- [ ] Refrescar lista de citas automáticamente
- [ ] Manejar desconexión y reconexión
- [ ] Implementar UI para que doctor confirme cita
