# Configuración de Clientes - Multi-Tenant GHL

Este documento describe la configuración de múltiples clientes en el sistema AI-Middleware.

## 📋 Resumen

El sistema soporta **4 clientes** diferentes, cada uno con su propia cuenta de GoHighLevel (GHL) y configuración de Vapi.

## 🔧 Clientes Configurados

### 1. Premier Wellness

- **Nombre**: Premier Wellness
- **Assistant ID**: `053cd610-596c-4632-a90b-a1e398712178`
- **GHL API Key**: `pit-ea7a24ba-ead3-4076-9afa-e0672c56d0f7`
- **Variable de entorno**: `GHL_API_KEY` (primary)
- **Slack Channel**: `SLACK_CHANNEL_ID_PREMIER_WELLNESS`

### 2. West Texas

- **Nombre**: West Texas
- **Assistant ID**: `09c07269-4462-4469-96ac-c4eb06146571`
- **GHL API Key**: `pit-71098f8f-4b2d-46fb-a5a6-c55cca460ecb`
- **Variable de entorno**: `GHL_API_KEY_SECONDARY` (secondary)
- **Slack Channel**: `SLACK_CHANNEL_ID_WEST_TEXAS`

### 3. Third Client

- **Nombre**: Third Client
- **Assistant ID**: `39ba1969-84bf-4991-ab9e-9b234178f5c2`
- **GHL API Key**: `pit-38da7913-a22e-46b4-873e-f4bb24de234b`
- **Variable de entorno**: `GHL_API_KEY_THIRD` (third)
- **Slack Channel**: `SLACK_CHANNEL_ID_THIRD_CLIENT`

### 4. Data Driven Practices

- **Nombre**: Data Driven Practices
- **Assistant ID**: `30abcadf-9a7c-4db7-8e5f-3d82977f1f5d`
- **GHL API Key**: `pit-bd654d7f-815a-4ae1-b593-62a0bc1ca497`
- **Variable de entorno**: `GHL_API_KEY_FOURTH` (fourth)
- **Slack Channel**: `SLACK_CHANNEL_ID_DATA_DRIVEN_PRACTICES`

## 🔄 Cómo Funciona

### Selección Automática de API Key

El sistema utiliza el `ClientConfigManager` para mapear automáticamente el `assistantId` de Vapi a la API Key correcta de GHL:

1. Vapi envía un webhook con el `assistantId`
2. El `ClientConfigManager` busca la configuración del cliente
3. Se usa la API Key correspondiente para todas las operaciones de GHL
4. Las grabaciones se envían al canal de Slack específico del cliente

### Ejemplo de Flujo

```
Webhook de Vapi
    ↓
assistantId: 30abcadf-9a7c-4db7-8e5f-3d82977f1f5d
    ↓
ClientConfigManager.getConfigByAssistantId()
    ↓
Cliente: Data Driven Practices
API Key: pit-bd654d7f-815a-4ae1-b593-62a0bc1ca497
    ↓
Operaciones GHL (contactos, notas, tags, etc.)
```

## 📝 Agregar un Nuevo Cliente

Para agregar un quinto cliente, sigue estos pasos:

### 1. Actualizar `env.example`

```bash
# Agregar nueva API key
GHL_API_KEY_FIFTH=your_fifth_ghl_api_key_here

# Agregar Assistant ID
GHL_FIFTH_ASSISTANT_ID=your_assistant_id_here

# Agregar canal de Slack (opcional)
SLACK_CHANNEL_ID_FIFTH_CLIENT=your_slack_channel_id
```

### 2. Actualizar `src/schemas.ts`

Cambiar todos los enums de `apiKey`:

```typescript
apiKey: z.enum(['primary', 'secondary', 'third', 'fourth', 'fifth']).optional().default('primary')
```

### 3. Actualizar `src/utils/client-config.ts`

Agregar la configuración del nuevo cliente:

```typescript
// Fifth Client Configuration
const fifthClientConfig: ClientConfig = {
  name: 'Fifth Client Name',
  assistantId: 'your-assistant-id-here',
  ghlApiKey: process.env.GHL_API_KEY_FIFTH || 'your-api-key-here',
};
if (process.env.SLACK_CHANNEL_ID_FIFTH_CLIENT) {
  fifthClientConfig.slackChannelId = process.env.SLACK_CHANNEL_ID_FIFTH_CLIENT;
}
this.configs.set('your-assistant-id-here', fifthClientConfig);
```

### 4. Actualizar `.env`

```bash
GHL_API_KEY_FIFTH=your_actual_api_key
GHL_FIFTH_ASSISTANT_ID=your_actual_assistant_id
SLACK_CHANNEL_ID_FIFTH_CLIENT=your_slack_channel_id
```

### 5. Recompilar y Reiniciar

```bash
npm run build
docker-compose -f docker-compose.dev.yml restart
# o
npm run dev
```

## 🔍 Verificación

Para verificar que un cliente está configurado correctamente:

1. Revisa los logs al iniciar el servidor:
   ```
   [CLIENT_CONFIG] Initialized client configurations
   ```

2. Haz una llamada de prueba con el Assistant ID del cliente

3. Verifica que:
   - Los contactos se crean en la cuenta GHL correcta
   - Las notas se agregan al contacto correcto
   - Las grabaciones se envían al canal de Slack correcto

## 🛠️ Troubleshooting

### Error: "No configuration found for Assistant ID"

**Causa**: El Assistant ID no está configurado en `ClientConfigManager`

**Solución**: 
1. Verifica que el Assistant ID esté en `src/utils/client-config.ts`
2. Asegúrate de que el `.env` tenga las variables correctas
3. Reinicia el servidor

### Error: "The token does not have access to this location"

**Causa**: La API Key de GHL no tiene permisos en esa ubicación

**Solución**:
1. Verifica que la API Key sea correcta para ese cliente
2. Revisa los permisos de la API Key en GHL
3. Asegúrate de que el `assistantId` esté mapeado a la API Key correcta

## 📚 Archivos Relacionados

- `src/utils/client-config.ts` - Configuración de clientes
- `src/schemas.ts` - Schemas de validación
- `src/ghl.ts` - Conector de GHL
- `src/vapi.ts` - Handler de webhooks de Vapi
- `env.example` - Plantilla de variables de entorno

## 🔐 Seguridad

- ⚠️ **NUNCA** subas el archivo `.env` a Git
- ⚠️ Las API Keys son sensibles y deben mantenerse privadas
- ⚠️ Cada cliente debe tener su propia API Key de GHL
- ✅ El `.gitignore` protege automáticamente el `.env`

## 📊 Estadísticas

- **Clientes Activos**: 4
- **API Keys Configuradas**: 4
- **Canales de Slack**: 4 (configurable por cliente)
- **Operaciones Soportadas**: 
  - Upsert Contact
  - Add Tag
  - Add Note
  - Update Stage
  - Send SMS

---

**Última actualización**: Noviembre 2024
**Versión del sistema**: 1.0.0


