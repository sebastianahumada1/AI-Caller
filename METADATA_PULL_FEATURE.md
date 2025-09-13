# Metadata Pull Feature - Implementación

## Resumen
Se agregó el flujo de polling para leer `call.metadata.ghl` desde la API de Vapi usando `call.id` sin romper funcionalidad existente.

## Archivos Modificados

### 1. `package.json`
- ✅ **Agregado**: `axios: ^1.6.0` para llamadas HTTP a la API de Vapi

### 2. `src/utils/vapi-client.ts`
- ✅ **Mejorado**: Cliente completo para API de Vapi con interceptores de logging
- ✅ **Nuevo método**: `getCall(callId)` - obtiene datos completos de la llamada
- ✅ **Nuevo método**: `getCallMetadata(callId)` - obtiene específicamente metadata y ghl
- ✅ **Logging prefijado**: `[VAPI_CLIENT]` para todas las operaciones

### 3. `src/vapi.ts`
- ✅ **Agregado**: Import de `VapiApiClient` sin tocar imports existentes
- ✅ **Agregado**: Propiedad `vapiApiClient` al constructor existente
- ✅ **Mejorado**: Método `pollForCallAnalysis` para usar API real y procesar metadata GHL
- ✅ **Nuevos métodos públicos**:
  - `pullCallMetadata(callId)` - Pull directo de metadata
  - `pullAndProcessGhlMetadata(callId)` - Pull y procesamiento automático GHL
  - `scheduleMetadataPull(callId, delays)` - Scheduling con delays configurables
- ✅ **Nuevo método privado**: `processGhlMetadata(callId, ghlMetadata)` - Procesa automáticamente contactos y tags

### 4. `src/server.ts`
- ✅ **Nuevo endpoint**: `POST /vapi/pull-metadata` - Pull manual de metadata con validación de token
- ✅ **Mejorado**: Health check incluye estado de configuración Vapi
- ✅ **Logging prefijado**: `[MANUAL_METADATA_PULL]` para operaciones manuales

### 5. `env.example`
- ✅ **Agregado**: Variables de entorno para configuración Vapi:
  - `VAPI_API_KEY=your_vapi_api_key_here`
  - `VAPI_API_BASE_URL=https://api.vapi.ai`

## Funcionalidades Implementadas

### 🔄 Polling Automático
- **Triggers**: Cuando `end-of-call-report` llega sin analysis
- **Delays por defecto**: [30s, 60s, 120s]
- **Logging**: `[ANALYSIS_POLL]` y `[GHL_METADATA_PROCESS]`

### 📡 Pull Manual
- **Endpoint**: `POST /vapi/pull-metadata`
- **Body**: `{ "callId": "call_123" }`
- **Autenticación**: Mismo token que webhook
- **Response**: Metadata completa + resultados de procesamiento

### 🏷️ Procesamiento Automático GHL
Cuando encuentra `call.metadata.ghl`:
- **Contactos**: Si hay `ghlMetadata.contact` → `upsertContact()`
- **Tags**: Si hay `ghlMetadata.tags[]` → `addTag()` para cada uno
- **Extensible**: Fácil agregar más acciones

### 📊 Logging Estructurado
Todos los logs tienen prefijos claros:
- `[VAPI_CLIENT]` - Operaciones del cliente API
- `[METADATA_PULL]` - Pull directo de metadata
- `[GHL_METADATA_PULL]` - Pull y procesamiento GHL
- `[GHL_METADATA_PROCESS]` - Procesamiento de metadata GHL
- `[METADATA_SCHEDULE]` - Scheduling de polls
- `[ANALYSIS_POLL]` - Polling de analysis existente mejorado
- `[MANUAL_METADATA_PULL]` - Pulls manuales via endpoint

## Configuración Requerida

### Variables de Entorno
```bash
# Obligatorias para la funcionalidad
VAPI_API_KEY=your_vapi_api_key_here
VAPI_API_BASE_URL=https://api.vapi.ai

# Existentes (no modificadas)
WEBHOOK_TOKEN=your_secure_webhook_token_here
```

### Dependencias
```bash
npm install  # Instala axios automáticamente
```

## Uso

### 1. Automático (Recomendado)
El sistema automáticamente:
1. Detecta `end-of-call-report` sin analysis
2. Programa polling en [30s, 60s, 120s]
3. Cuando encuentra `call.metadata.ghl`, lo procesa automáticamente

### 2. Manual
```bash
curl -X POST http://localhost:3000/vapi/pull-metadata \
  -H "Content-Type: application/json" \
  -d '{"callId": "call_123"}' \
  -G -d "token=your_webhook_token"
```

### 3. Programático
```typescript
const result = await vapiHandler.pullAndProcessGhlMetadata("call_123");
```

## Compatibilidad
- ✅ **Sin breaking changes**: Toda la funcionalidad existente intacta
- ✅ **Retrocompatible**: Webhooks existentes funcionan igual
- ✅ **Opcional**: La funcionalidad se activa solo con variables de entorno configuradas
- ✅ **Resiliente**: Errores en metadata pull no afectan webhook principal

## Health Check
Nuevo endpoint `GET /health` incluye:
```json
{
  "checks": {
    "vapiApiKey": true,
    "vapiApiBaseUrl": true
  },
  "features": {
    "metadataPull": true,
    "ghlToolSupport": true,
    "scheduledPolling": true
  }
}
```
