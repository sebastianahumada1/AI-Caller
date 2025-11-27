# Integración de Slack para Grabaciones de VAPI

Esta integración permite que las grabaciones de llamadas de VAPI se suban automáticamente a un canal de Slack especificado.

## 🚀 Configuración Rápida

### 1. Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```bash
# Slack Configuration (for recording uploads)
SLACK_BOT_TOKEN=your_slack_bot_token_here
SLACK_CHANNEL_ID=C09J96WA942
```

### 2. Configuración de VAPI

En tu configuración de VAPI, asegúrate de que las grabaciones estén habilitadas y que el webhook incluya la URL de grabación:

```json
{
  "recordingEnabled": true,
  "recordingPath": "gs://your-bucket/recordings/",
  "recordingCredentials": {
    "provider": "gcp",
    "serviceAccountKey": "your-service-account-json"
  }
}
```

## 🔧 Cómo Funciona

### Flujo Automático

1. **VAPI termina una llamada** y envía un webhook `end-of-call-report`
2. **El middleware detecta** si hay una `recordingUrl` en el webhook
3. **Descarga la grabación** desde la URL proporcionada
4. **Sube el archivo a Slack** en el canal configurado
5. **Envía información adicional** como duración, costo, resumen y sentimiento

### Estructura del Webhook

El webhook debe incluir la URL de grabación en uno de estos campos:

```json
{
  "message": {
    "type": "end-of-call-report",
    "call": {
      "id": "call_123",
      "recordingUrl": "https://storage.googleapis.com/bucket/recording.mp3"
    },
    "duration": 125,
    "cost": 0.0234,
    "analysis": {
      "summary": "Customer inquired about pricing",
      "sentiment": "positive"
    }
  }
}
```

O alternativamente:

```json
{
  "message": {
    "type": "end-of-call-report",
    "recordingUrl": "https://storage.googleapis.com/bucket/recording.mp3",
    "call": {
      "id": "call_123"
    }
  }
}
```

## 🧪 Pruebas

### Probar la Integración

```bash
# Construir el proyecto
npm run build

# Iniciar el servidor
npm start

# En otra terminal, probar la integración
npm run test:slack
```

### Endpoints de Prueba

#### 1. Health Check
```bash
GET /health
```

Respuesta incluye el estado de Slack:
```json
{
  "checks": {
    "slackBotToken": true,
    "slackChannelId": true
  },
  "features": {
    "slackIntegration": true
  }
}
```

#### 2. Test de Conexión de Slack
```bash
POST /slack/test?token=YOUR_WEBHOOK_TOKEN
```

Respuesta:
```json
{
  "ok": true,
  "message": "Slack connection successful",
  "connected": true
}
```

### Prueba Manual con cURL

```bash
# Test con grabación
curl -X POST "http://localhost:3000/vapi/webhook?token=YOUR_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "type": "end-of-call-report",
      "call": {
        "id": "test_call_123",
        "recordingUrl": "https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav"
      },
      "duration": 125,
      "cost": 0.0234,
      "analysis": {
        "summary": "Test call completed successfully",
        "sentiment": "positive"
      }
    }
  }'
```

## 📱 Resultado en Slack

Cuando se sube una grabación, verás:

1. **Archivo de audio** subido al canal
2. **Mensaje con contexto** que incluye:
   - 📞 ID de la llamada
   - ⏱️ Duración de la llamada
   - 💰 Costo de la llamada
   - 😊 Sentimiento detectado
   - 📝 Resumen de la llamada

## 🔍 Logs y Monitoreo

### Logs Relevantes

Busca estos prefijos en los logs:

- `[SLACK_SERVICE]` - Operaciones del servicio de Slack
- `[SLACK_UPLOAD]` - Subida de grabaciones
- `[SLACK_TEST]` - Pruebas de conexión

### Ejemplo de Logs Exitosos

```
[SLACK_SERVICE] Initialized { hasToken: true, defaultChannel: 'C09J96WA942' }
[SLACK_UPLOAD] Starting recording upload to Slack { callId: 'call_123', recordingUrl: '...' }
[SLACK_SERVICE] Recording downloaded { callId: 'call_123', sizeBytes: 1048576 }
[SLACK_SERVICE] Recording uploaded successfully { callId: 'call_123', fileId: 'F123456' }
```

## ⚠️ Solución de Problemas

### Error: "SLACK_BOT_TOKEN environment variable is required"

**Solución:** Verifica que la variable `SLACK_BOT_TOKEN` esté configurada en tu `.env`

### Error: "Slack upload failed: invalid_auth"

**Solución:** 
1. Verifica que el bot token sea correcto
2. Asegúrate de que el bot tenga permisos `files:write`

### Error: "Slack upload failed: channel_not_found"

**Solución:**
1. Verifica que el `SLACK_CHANNEL_ID` sea correcto
2. Invita el bot al canal: `/invite @YourBotName`

### Error: "Failed to download recording"

**Solución:**
1. Verifica que la URL de grabación sea accesible
2. Revisa los permisos de acceso al bucket de GCS

### No se suben grabaciones automáticamente

**Verificar:**
1. VAPI está enviando `recordingUrl` en el webhook
2. Las variables de entorno están configuradas
3. El servidor está recibiendo los webhooks correctamente

## 🔧 Configuración Avanzada

### Personalizar el Canal por Llamada

Puedes modificar el código para usar diferentes canales según el contexto:

```typescript
// En vapi.ts, método uploadRecordingToSlack
const channelId = message.metadata?.slackChannel || this.defaultChannelId;
```

### Filtrar Grabaciones

Para subir solo ciertas grabaciones:

```typescript
// Ejemplo: solo subir llamadas largas
if (message.duration && message.duration > 60) {
  await this.uploadRecordingToSlack(recordingUrl, callId, context);
}
```

### Formato de Mensaje Personalizado

Modifica `SlackService.uploadRecordingWithContext()` para personalizar el formato del mensaje.

## 📋 Checklist de Implementación

- [x] ✅ Variables de entorno configuradas
- [x] ✅ Bot de Slack creado con permisos correctos
- [x] ✅ Bot invitado al canal objetivo
- [x] ✅ Dependencias instaladas (`form-data`)
- [x] ✅ Código de integración implementado
- [x] ✅ Endpoints de prueba agregados
- [x] ✅ Script de prueba creado
- [ ] 🔄 VAPI configurado para enviar `recordingUrl`
- [ ] 🔄 Pruebas realizadas con grabaciones reales

## 🚀 Próximos Pasos

1. **Configura VAPI** para incluir `recordingUrl` en los webhooks
2. **Realiza pruebas** con llamadas reales
3. **Monitorea los logs** para asegurar que todo funcione correctamente
4. **Personaliza** el formato de mensajes según tus necesidades

¡La integración está lista para usar! 🎉
