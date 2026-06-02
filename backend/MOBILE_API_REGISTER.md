# 📱 API Móvil - Endpoint de Registro Actualizado

## Endpoint: POST `/api/mobile/auth/register`

### ✅ Cambios Realizados

El endpoint ahora **acepta y almacena correctamente el parámetro `rol`**.

#### Antes ❌
- No aceptaba el parámetro `rol`
- Asignaba automáticamente el rol como "CLIENTE"
- No almacenaba foto_perfil ni otros campos opcionales

#### Después ✅
- Acepta `rol` en el request body
- Valida que sea un rol permitido (PACIENTE, CLIENTE)
- Lo almacena correctamente en la base de datos
- Devuelve el rol en la respuesta
- Almacena todos los campos: foto_perfil, telefono, apellido

---

## 📤 Request

### Headers
```json
{
  "Content-Type": "application/json"
}
```

### Body
```json
{
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "juan@example.com",
  "password": "Password123!",
  "telefono": "+34 612 345 678",
  "foto_perfil": "https://example.com/photo.jpg",
  "rol": "Paciente"
}
```

### Campos

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `nombre` | String | ✅ | Nombre del usuario |
| `apellido` | String | ❌ | Apellido del usuario |
| `email` | String | ✅ | Email único para login |
| `password` | String | ✅ | Contraseña (almacenada en Supabase Auth) |
| `telefono` | String | ❌ | Número de teléfono |
| `foto_perfil` | String (URL) | ❌ | URL de la foto de perfil |
| `rol` | String | ❌ | Rol del usuario (por defecto: "PACIENTE") |

### Roles Permitidos

```
- "Paciente" → se guarda como "PACIENTE"
- "PACIENTE" → se guarda como "PACIENTE"
- "Cliente" → se guarda como "CLIENTE"
- "CLIENTE" → se guarda como "CLIENTE"
```

⚠️ **Si no se envía `rol`, se asigna automáticamente "PACIENTE"**

---

## 📥 Response

### ✅ Success (201 Created)
```json
{
  "message": "Usuario registrado exitosamente",
  "code": "REGISTER_SUCCESS",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan@example.com",
    "telefono": "+34 612 345 678",
    "foto_perfil": "https://example.com/photo.jpg",
    "rol": "PACIENTE",
    "activo": true
  }
}
```

### ❌ Error Cases

#### 1. Campos Requeridos Faltantes (400)
```json
{
  "message": "Email, contraseña y nombre son requeridos",
  "code": "MISSING_FIELDS"
}
```

#### 2. Rol Inválido (400)
```json
{
  "message": "Rol inválido. Roles permitidos: PACIENTE, CLIENTE",
  "code": "INVALID_ROLE"
}
```

#### 3. Email ya Registrado (400)
```json
{
  "message": "Error al registrar",
  "error": "User already registered",
  "code": "AUTH_ERROR"
}
```

#### 4. Error al Crear Perfil (400)
```json
{
  "message": "Error al crear perfil",
  "error": "...",
  "code": "PROFILE_ERROR"
}
```

#### 5. Error Interno del Servidor (500)
```json
{
  "message": "Error interno",
  "error": "...",
  "code": "SERVER_ERROR"
}
```

---

## 🔐 Endpoints Relacionados

### Login: POST `/api/mobile/auth/login`
```json
{
  "email": "juan@example.com",
  "password": "Password123!"
}
```

**Respuesta incluye el rol del usuario:**
```json
{
  "message": "Login exitoso",
  "code": "LOGIN_SUCCESS",
  "user": {
    "id": "...",
    "nombre": "Juan",
    "rol": "PACIENTE",
    "...": "..."
  },
  "token": "eyJhbGc...",
  "refreshToken": "..."
}
```

### Perfil: GET `/api/mobile/profile`
**Headers:**
```json
{
  "Authorization": "Bearer {token}"
}
```

**Respuesta incluye el rol:**
```json
{
  "code": "PROFILE_SUCCESS",
  "profile": {
    "id": "...",
    "nombre": "Juan",
    "rol": "PACIENTE",
    "...": "..."
  }
}
```

---

## 🧪 Ejemplo de Prueba con cURL

```bash
curl -X POST http://localhost:3001/api/mobile/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan@example.com",
    "password": "Password123!",
    "telefono": "+34 612 345 678",
    "foto_perfil": "https://example.com/photo.jpg",
    "rol": "Paciente"
  }'
```

---

## 💾 Base de Datos

La tabla `usuarios` ahora almacena:
- ✅ `rol` (VARCHAR) - El rol del usuario (PACIENTE, CLIENTE, etc.)
- ✅ `foto_perfil` (VARCHAR) - URL de la foto
- ✅ `telefono` (VARCHAR) - Teléfono del usuario
- ✅ `apellido` (VARCHAR) - Apellido del usuario
- ✅ `creado_en` (TIMESTAMP) - Fecha de creación

---

## 🔄 Resumen de Cambios

| Función | Antes | Después |
|---------|-------|---------|
| `mobileRegister` | Rol hardcodeado "CLIENTE" | Acepta y valida `rol` del request |
| `mobileLogin` | Devuelve rol "CLIENTE" | Devuelve rol real de la BD |
| `getMobileProfile` | Devuelve rol "CLIENTE" | Devuelve rol real de la BD |

---

## ⚠️ Notas Importantes

1. **Supabase Auth vs Base de Datos:**
   - El `rol` se almacena en Supabase Auth (en los metadatos de user)
   - También se almacena en la tabla `usuarios` para facilitar consultas

2. **Validación de Roles:**
   - Los roles se convierten a MAYÚSCULAS automáticamente
   - Solo se permiten "PACIENTE" y "CLIENTE"
   - Si se envía otro rol, se rechaza con código `INVALID_ROLE`

3. **Valor por Defecto:**
   - Si no se envía `rol`, se asigna automáticamente "PACIENTE"

4. **JWT Token:**
   - El token JWT incluye el `rol` del usuario
   - Válido por 30 días para aplicaciones móviles

---

## 📞 Soporte

Si tienes problemas con el registro, verifica:
1. ✅ Que el email tenga formato válido
2. ✅ Que la contraseña cumpla los requisitos de Supabase
3. ✅ Que el `rol` esté en la lista permitida
4. ✅ Que la tabla `usuarios` tenga las columnas: `rol`, `foto_perfil`, `telefono`, `apellido`
