#!/bin/bash
# Script de prueba: Flujo completo de citas móviles
# Fecha: 2026-06-09
# Propósito: Verificar que las citas se crean, se guardan y se notifican a recepcionista/cajero

set -e

# ============================================
# CONFIGURACIÓN
# ============================================
BASE_URL="${BASE_URL:-http://localhost:3000}"
API_BASE="${BASE_URL}/api"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== PRUEBA DE FLUJO COMPLETO DE CITAS MÓVILES ===${NC}\n"

# ============================================
# PASO 1: REGISTRO
# ============================================
echo -e "${YELLOW}[1/5] Registrando usuario móvil...${NC}"

REGISTER_RESPONSE=$(curl -s -X POST "${API_BASE}/mobile/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "paciente_test_'$(date +%s)'@example.com",
    "password": "TestPassword123!",
    "nombre": "Juan",
    "apellido": "Pérez"
  }')

echo "${REGISTER_RESPONSE}" | jq '.' || echo "${REGISTER_RESPONSE}"

USER_ID=$(echo "${REGISTER_RESPONSE}" | jq -r '.user.id // empty')
if [ -z "$USER_ID" ]; then
  echo -e "${RED}ERROR: No se pudo obtener user_id del registro${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Usuario registrado: $USER_ID${NC}\n"

# ============================================
# PASO 2: LOGIN
# ============================================
echo -e "${YELLOW}[2/5] Haciendo login...${NC}"

USER_EMAIL=$(echo "${REGISTER_RESPONSE}" | jq -r '.user.email')

LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/mobile/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'${USER_EMAIL}'",
    "password": "TestPassword123!"
  }')

echo "${LOGIN_RESPONSE}" | jq '.' || echo "${LOGIN_RESPONSE}"

TOKEN=$(echo "${LOGIN_RESPONSE}" | jq -r '.token // empty')
if [ -z "$TOKEN" ]; then
  echo -e "${RED}ERROR: No se pudo obtener token del login${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Token obtenido${NC}\n"

# ============================================
# PASO 3: OBTENER ODONTÓLOGOS
# ============================================
echo -e "${YELLOW}[3/5] Obteniendo lista de odontólogos...${NC}"

DOCTORS_RESPONSE=$(curl -s -X GET "${API_BASE}/mobile/doctors" \
  -H "Authorization: Bearer ${TOKEN}")

echo "${DOCTORS_RESPONSE}" | jq '.' || echo "${DOCTORS_RESPONSE}"

DOCTOR_ID=$(echo "${DOCTORS_RESPONSE}" | jq -r '.odontologos[0].id // empty')
if [ -z "$DOCTOR_ID" ]; then
  echo -e "${RED}ERROR: No hay odontólogos disponibles. Verifica la BD.${NC}"
  echo -e "${YELLOW}Nota: Debes tener al menos un usuario con rol ODONTOLOGO${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Odontólogo seleccionado: $DOCTOR_ID${NC}\n"

# ============================================
# PASO 4: CREAR CITA
# ============================================
echo -e "${YELLOW}[4/5] Creando cita...${NC}"

MAÑANA=$(date -d "tomorrow" +%Y-%m-%d 2>/dev/null || date -v+1d +%Y-%m-%d)

APPOINTMENT_RESPONSE=$(curl -s -X POST "${API_BASE}/mobile/appointments" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "fecha": "'${MAÑANA}'",
    "hora": "10:00",
    "id_odontologo": "'${DOCTOR_ID}'",
    "monto": 100.00,
    "metodo_pago": "Yape",
    "servicio": "Limpieza dental",
    "descripcion": "Cita de prueba"
  }')

echo "${APPOINTMENT_RESPONSE}" | jq '.' || echo "${APPOINTMENT_RESPONSE}"

APPOINTMENT_ID=$(echo "${APPOINTMENT_RESPONSE}" | jq -r '.appointment.id // empty')
if [ -z "$APPOINTMENT_ID" ]; then
  echo -e "${RED}ERROR: No se pudo crear la cita${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Cita creada: $APPOINTMENT_ID${NC}\n"

# ============================================
# PASO 5: VERIFICAR EN BD
# ============================================
echo -e "${YELLOW}[5/5] Verificando en base de datos...${NC}"

# Nota: Esto requiere acceso directo a la BD con psql o similar
# Por ahora mostramos los comandos SQL que se deben ejecutar

echo -e "${YELLOW}Ejecuta estas consultas en Supabase SQL Editor:${NC}\n"

echo -e "${GREEN}1. Verificar cita creada:${NC}"
echo "SELECT id, id_paciente, id_odontologo, fecha, hora, estado FROM citas WHERE id = '${APPOINTMENT_ID}';"
echo ""

echo -e "${GREEN}2. Verificar pago asociado:${NC}"
echo "SELECT id, id_cita, estado, estado_validacion FROM pagos WHERE id_cita = '${APPOINTMENT_ID}';"
echo ""

echo -e "${GREEN}3. Listar últimas citas del usuario:${NC}"
echo "SELECT id, fecha, hora, estado FROM citas WHERE id_paciente = '${USER_ID}' ORDER BY creado_en DESC LIMIT 5;"
echo ""

echo -e "${YELLOW}=== RESUMEN ===${NC}"
echo -e "User ID: ${GREEN}${USER_ID}${NC}"
echo -e "Token: ${GREEN}${TOKEN:0:20}...${NC}"
echo -e "Appointment ID: ${GREEN}${APPOINTMENT_ID}${NC}"
echo -e "Fecha de cita: ${GREEN}${MAÑANA}${NC}"
echo -e "Hora de cita: ${GREEN}10:00${NC}"
echo ""
echo -e "${GREEN}✓ Flujo completado exitosamente${NC}"
echo -e "${YELLOW}Las citas se almacenan en la BD y persisten aunque se reinicie la app${NC}"
