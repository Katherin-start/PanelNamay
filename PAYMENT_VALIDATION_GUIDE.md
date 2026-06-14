## Resumen: Solución de Comprobantes de Pago para Cajero/Recepcionista

### Problema
El cajero y recepcionista no podían ver los comprobantes de pago (capturas de Yape/Efectivo) subidas por los pacientes para validarlos.

### Solución Implementada

#### 1. Nuevo Endpoint para Ver Comprobantes Pendientes
**Ruta:** `GET /api/payments/pending-validation`
**Quién puede acceder:** CAJERO, RECEPCIONISTA
**Qué devuelve:** Lista de pagos con estado_validacion = 'POR_CONFIRMAR' y comprobante adjunto

**Ejemplo de uso (curl):**
```bash
curl -X GET http://localhost:4000/api/payments/pending-validation \
  -H "Authorization: Bearer <token_del_cajero>"
```

**Respuesta:**
```json
{
  "code": "PENDING_VALIDATION_SUCCESS",
  "payments": [
    {
      "id": 1,
      "id_cita": 1,
      "monto": 100,
      "metodo_pago": "Yape",
      "estado": "pendiente",
      "estado_validacion": "POR_CONFIRMAR",
      "comprobante": "https://...",
      "fecha": "2026-06-13",
      "citas": { "fecha": "2026-06-13", "hora": "16:00", ... },
      "usuarios_paciente": { "nombre": "Juan", "apellido": "Pérez", ... }
    }
  ]
}
```

#### 2. Validar un Comprobante
**Ruta:** `PUT /api/payments/:paymentId/validation`
**Quién puede acceder:** CAJERO, RECEPCIONISTA
**Body:**
```json
{
  "estado_validacion": "APROBADO"  // o "RECHAZADO"
}
```

**Ejemplo (curl):**
```bash
curl -X PUT http://localhost:4000/api/payments/1/validation \
  -H "Authorization: Bearer <token_del_cajero>" \
  -H "Content-Type: application/json" \
  -d '{"estado_validacion": "APROBADO"}'
```

**Qué sucede:**
- Si estado_validacion = "APROBADO": el pago cambia a estado "pagado"
- Si estado_validacion = "RECHAZADO": el pago cambia a estado "rechazado"
- El comprobante se elimina del almacenamiento tras validar

#### 3. Notificaciones Socket (Real-time)
Cuando un paciente sube un comprobante:
```javascript
// Evento emitido a CAJERO y RECEPCIONISTA
io.to(`user_${cajererId}`).emit('payment_proof_uploaded', { payment });
```

---

### Cambios Realizados

| Archivo | Cambio |
|---------|--------|
| `paymentController.js` | ✅ Añadido endpoint `getPendingValidationPayments` |
| `paymentRoutes.js` | ✅ Añadida ruta `/pending-validation` |
| `mobileController.js` | ✅ Notificaciones al subir comprobante |

---

### Flujo Completo

1. **Paciente crea cita** → se emite evento `new_mobile_appointment` al CAJERO/RECEPCIONISTA
2. **Paciente sube comprobante de pago** → se emite evento `payment_proof_uploaded`
3. **CAJERO/RECEPCIONISTA accede a `/pending-validation`** → ve lista de comprobantes
4. **CAJERO valida comprobante** → llamada a `PUT /api/payments/:id/validation` con `APROBADO` o `RECHAZADO`

---

### Cómo Implementar en Frontend (Web/Dashboard)

**Listar comprobantes pendientes:**
```typescript
async function getPendingPayments(token: string) {
  const response = await fetch('http://localhost:4000/api/payments/pending-validation', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}
```

**Validar un comprobante:**
```typescript
async function validatePayment(paymentId: number, status: 'APROBADO' | 'RECHAZADO', token: string) {
  const response = await fetch(`http://localhost:4000/api/payments/${paymentId}/validation`, {
    method: 'PUT',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ estado_validacion: status })
  });
  return response.json();
}
```

---

### Próximos Pasos
- Crear dashboard en `frontend/` que muestre comprobantes pendientes
- Implementar WebSocket listener para evento `payment_proof_uploaded`
- Mostrar imagen del comprobante en modal/preview
- Botones para APROBADO/RECHAZADO en el dashboard
