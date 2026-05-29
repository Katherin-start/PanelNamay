# 🛠️ Solución: Error "Bucket de archivos no configurado"

## ✅ Solución Automática (Recomendada)

La aplicación ahora **configura automáticamente** el bucket `chat-files` cuando accedes al chat. 

### Paso 1: Reinicia el Backend

Asegúrate de que el servidor backend está ejecutándose:

```bash
cd backend
npm run dev
```

Deberías ver en la consola:
```
✅ Server running on port 4000
```

### Paso 2: Abre el Chat

1. Abre la aplicación en el navegador
2. Ve a la sección de **Chat**
3. El sistema configurará automáticamente el bucket

Verás en la consola del navegador:
```
🔧 Inicializando Supabase Storage...
✅ Storage inicializado
```

### Paso 3: Intenta Enviar un Archivo

1. Selecciona un contacto
2. Adjunta una imagen o documento
3. ¡Debería funcionar!

---

## 📋 Si Aún No Funciona

### Opción 1: Inicializar Manualmente (Terminal)

Ejecuta este comando en la terminal para inicializar el storage:

```bash
curl -X POST http://localhost:4000/api/setup/initialize-storage
```

Deberías recibir una respuesta como:
```json
{
  "code": "BUCKET_CREATED",
  "message": "Bucket chat-files creado exitosamente",
  "bucket": { ... }
}
```

### Opción 2: Crear Manualmente en Supabase

Si el comando anterior no funciona:

1. Ve a https://app.supabase.com
2. Selecciona tu proyecto
3. En el menú izquierdo, ve a **Storage**
4. Haz clic en **Create Bucket**
5. Nombre: `chat-files`
6. ✅ Marca **Public bucket**
7. Haz clic en **Create**

---

## 🔍 Verificar Estado

Para verificar el estado completo del sistema:

```bash
curl http://localhost:4000/api/setup/health
```

Respuesta esperada:
```json
{
  "code": "HEALTH_OK",
  "database": "conectado",
  "storage": {
    "conectado": true,
    "buckets": [
      { "name": "chat-files", "public": true }
    ],
    "chatFilesExiste": true,
    "chatFilesPublico": true
  }
}
```

---

## 🚀 Características Nuevas

✅ **Inicialización Automática** - El backend crea el bucket automáticamente
✅ **Health Check** - Verifica el estado del sistema
✅ **Reintentos Automáticos** - Si falla, reintenta en 5 segundos
✅ **Banner de Estado** - Notificación visual si hay problemas

---

## 📝 Notas Técnicas

- El bucket se crea con **limitación de 20 MB** por archivo
- Los archivos se almacenan públicamente en Supabase Storage
- Las carpetas se organizan por conversación: `chat/{id_conversacion}/`

---

## 🎯 Resumen Rápido

1. ✅ Backend corriendo en `localhost:4000`
2. ✅ Abre el chat
3. ✅ El sistema configura automáticamente el bucket
4. ✅ Envía archivos sin problemas

¡Listo! 🎉
