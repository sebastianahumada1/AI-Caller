# 🔧 Soluciones de Persistencia para Vercel

## ⚠️ Problema

Vercel es **serverless** y **stateless**. Cada webhook es una invocación independiente:

```
❌ NO FUNCIONA EN VERCEL:
  Webhook 1 (tool-calls) → Guarda datos en memoria
  Webhook 2 (call.ended) → Nueva instancia, memoria vacía ❌
```

**Estado actual del código que NO funcionará:**
```typescript
private sentNotes: Set<string>;
private callSummaries: Map<string, string>;
```

---

## ✅ Solución 1: Vercel KV (Redis) - **RECOMENDADA**

### 🎯 Por qué es la mejor

- ✅ Nativa de Vercel (integración perfecta)
- ✅ Rápida (Redis en memoria)
- ✅ Fácil de usar
- ✅ Plan gratuito disponible
- ✅ TTL automático (limpieza automática)

### 📦 Instalación

```bash
npm install @vercel/kv
```

### 🔧 Configuración en Vercel

1. Ve a tu proyecto en Vercel Dashboard
2. Storage → Create Database → KV
3. Link to project → Las variables de entorno se agregan automáticamente

### 💻 Implementación

Crear `src/utils/state-storage.ts`:

```typescript
import { kv } from '@vercel/kv';
import { Logger } from './logger.js';

export class StateStorage {
  private prefix: string;
  private ttl: number; // Time to live in seconds

  constructor(prefix = 'vapi', ttl = 86400) { // 24 hours default
    this.prefix = prefix;
    this.ttl = ttl;
  }

  /**
   * Store call summary
   */
  async storeCallSummary(callId: string, summary: string): Promise<void> {
    try {
      const key = `${this.prefix}:summary:${callId}`;
      await kv.set(key, summary, { ex: this.ttl });
      Logger.info('[STATE_STORAGE] Summary stored', { callId, ttl: this.ttl });
    } catch (error) {
      Logger.error('[STATE_STORAGE] Failed to store summary', {
        callId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get call summary
   */
  async getCallSummary(callId: string): Promise<string | null> {
    try {
      const key = `${this.prefix}:summary:${callId}`;
      const summary = await kv.get<string>(key);
      Logger.info('[STATE_STORAGE] Summary retrieved', { 
        callId, 
        found: !!summary 
      });
      return summary;
    } catch (error) {
      Logger.error('[STATE_STORAGE] Failed to get summary', {
        callId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Check if note was already sent
   */
  async wasNoteSent(callId: string, contactId: string): Promise<boolean> {
    try {
      const key = `${this.prefix}:note:${callId}:${contactId}`;
      const exists = await kv.exists(key);
      return exists === 1;
    } catch (error) {
      Logger.error('[STATE_STORAGE] Failed to check note status', {
        callId,
        contactId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Mark note as sent
   */
  async markNoteSent(callId: string, contactId: string): Promise<void> {
    try {
      const key = `${this.prefix}:note:${callId}:${contactId}`;
      await kv.set(key, true, { ex: this.ttl });
      Logger.info('[STATE_STORAGE] Note marked as sent', { callId, contactId });
    } catch (error) {
      Logger.error('[STATE_STORAGE] Failed to mark note', {
        callId,
        contactId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Store tool call data for later use
   */
  async storeToolCallData(callId: string, data: any): Promise<void> {
    try {
      const key = `${this.prefix}:toolcall:${callId}`;
      await kv.set(key, JSON.stringify(data), { ex: this.ttl });
      Logger.info('[STATE_STORAGE] Tool call data stored', { callId });
    } catch (error) {
      Logger.error('[STATE_STORAGE] Failed to store tool call data', {
        callId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get tool call data
   */
  async getToolCallData(callId: string): Promise<any | null> {
    try {
      const key = `${this.prefix}:toolcall:${callId}`;
      const data = await kv.get<string>(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      Logger.error('[STATE_STORAGE] Failed to get tool call data', {
        callId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Delete call data (cleanup)
   */
  async deleteCallData(callId: string): Promise<void> {
    try {
      const keys = [
        `${this.prefix}:summary:${callId}`,
        `${this.prefix}:toolcall:${callId}`,
      ];
      await Promise.all(keys.map(key => kv.del(key)));
      Logger.info('[STATE_STORAGE] Call data deleted', { callId });
    } catch (error) {
      Logger.error('[STATE_STORAGE] Failed to delete call data', {
        callId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
```

### 📝 Actualizar `src/vapi.ts`

```typescript
import { StateStorage } from './utils/state-storage.js';

export class VapiWebhookHandler {
  private ghlConnector: GHLConnector;
  private vapiApiClient: VapiApiClient;
  private slackService: SlackService | null;
  private stateStorage: StateStorage; // ✅ Nuevo

  constructor() {
    this.ghlConnector = new GHLConnector();
    this.vapiApiClient = new VapiApiClient();
    this.stateStorage = new StateStorage(); // ✅ Nuevo
    
    // Remover:
    // this.sentNotes = new Set(); ❌
    // this.callSummaries = new Map(); ❌
    
    try {
      this.slackService = new SlackService();
      Logger.info('[VAPI_HANDLER] Slack integration enabled');
    } catch (error) {
      this.slackService = null;
      Logger.warn('[VAPI_HANDLER] Slack integration disabled');
    }
  }

  private async handleEndOfCallReport(message: any): Promise<WebhookResponse> {
    // Guardar summary
    if (message.call?.id && message.analysis?.summary) {
      await this.stateStorage.storeCallSummary(
        message.call.id, 
        message.analysis.summary
      );
    }

    // ... resto del código
  }

  private async pullAndProcessGhlMetadata(callId: string) {
    // Recuperar summary guardado
    const summary = await this.stateStorage.getCallSummary(callId);
    
    if (summary) {
      Logger.info('[METADATA_PULL] Using stored summary', { callId });
      // Usar el summary...
    }

    // ... resto del código
  }
}
```

---

## ✅ Solución 2: Usar Vapi API (Sin persistencia externa)

### 🎯 Ventajas

- ✅ No necesita base de datos externa
- ✅ Usa la API de Vapi para recuperar datos
- ✅ Más simple de implementar

### 🎯 Desventajas

- ⚠️ Requiere llamadas adicionales a Vapi API
- ⚠️ Depende de que Vapi tenga los datos disponibles

### 💻 Implementación

En lugar de guardar en memoria, siempre consultar Vapi API:

```typescript
private async handleCallEnded(message: any): Promise<WebhookResponse> {
  const callId = message.call?.id;
  
  if (!callId) {
    return { ok: true, message: 'Call ended - no ID' };
  }

  // 🔥 En lugar de buscar en memoria, consultar Vapi API
  try {
    const callData = await this.vapiApiClient.getCall(callId);
    const summary = callData?.analysis?.summary;
    
    // Procesar con los datos de Vapi
    if (summary) {
      await this.processCallSummary(callId, summary);
    }
    
    // Post to Slack/GHL con datos frescos de Vapi
    await this.postToSlackAndGHL(callId, callData);
    
  } catch (error) {
    Logger.error('[CALL_ENDED] Failed to get call data from Vapi', {
      callId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return { ok: true, message: 'Call ended processed' };
}
```

---

## ✅ Solución 3: Procesar Todo en Tool-Calls (Sin esperar call.ended)

### 🎯 Concepto

En lugar de esperar a `call.ended`, procesar todo cuando llegan los `tool-calls`:

```typescript
private async handleToolCalls(toolCalls: VapiToolCall[]): Promise<ToolResult[]> {
  const results = await Promise.all(
    toolCalls.map(async (toolCall) => {
      
      // 1. Ejecutar el tool call normal
      const result = await this.dispatchToolCall(toolCall);
      
      // 2. También enviar a Slack INMEDIATAMENTE
      if (this.slackService && result.ok) {
        await this.slackService.sendMessage({
          channelId: process.env.SLACK_CHANNEL_ID!,
          text: `✅ Tool executed: ${toolCall.name}\n${JSON.stringify(result)}`,
        });
      }
      
      // 3. También actualizar GHL INMEDIATAMENTE
      if (result.ok) {
        await this.ghlConnector.addNote({
          phone: toolCall.arguments.phone,
          note: `Tool executed: ${toolCall.name}`,
        });
      }
      
      return result;
    })
  );
  
  return results;
}
```

### 🎯 Ventajas

- ✅ No necesita persistencia
- ✅ No depende de `call.ended`
- ✅ Feedback inmediato

### 🎯 Desventajas

- ⚠️ No tienes el resumen final de la llamada
- ⚠️ No tienes la grabación (llega en end-of-call-report)

---

## 🎯 Comparación de Soluciones

| Característica | Vercel KV | Vapi API | Tool-Calls Only |
|----------------|-----------|----------|-----------------|
| **Complejidad** | Media | Baja | Muy Baja |
| **Costo** | Gratis → Paid | Incluido | Incluido |
| **Latencia** | Muy rápida | Media | Rápida |
| **Confiabilidad** | Alta | Depende de Vapi | Alta |
| **Datos disponibles** | Todos | Los de Vapi | Limitados |
| **Resumen final** | ✅ | ✅ | ❌ |
| **Grabación** | ✅ | ✅ | ❌ |
| **Escalabilidad** | Excelente | Buena | Excelente |

---

## 🚀 Recomendación

### Para Producción Seria: **Vercel KV** (Solución 1)
- Mejor control y rendimiento
- Datos siempre disponibles
- Escalable

### Para MVP Rápido: **Vapi API** (Solución 2)
- Más simple de implementar
- Sin dependencias externas
- Suficiente para empezar

### Para Casos Simples: **Tool-Calls Only** (Solución 3)
- Si no necesitas el resumen final
- Si no necesitas la grabación
- Máxima simplicidad

---

## 📋 Próximos Pasos

### Si eliges Vercel KV:

1. Instalar dependencia:
```bash
npm install @vercel/kv
```

2. Crear base de datos KV en Vercel Dashboard

3. Crear archivo `src/utils/state-storage.ts`

4. Actualizar `src/vapi.ts` para usar StateStorage

5. Rebuild y redesplegar:
```bash
npm run build
git add .
git commit -m "Add Vercel KV persistence"
git push
```

### Si eliges Vapi API:

1. Verificar que VapiApiClient tenga método `getCall()`

2. Actualizar handlers para consultar Vapi en `call.ended`

3. No se necesita cambiar nada más

### Si eliges Tool-Calls Only:

1. Mover lógica de Slack/GHL a `handleToolCalls`

2. Remover dependencia de `call.ended`

3. Simplificar código

---

## 📚 Documentación Adicional

- [Vercel KV Docs](https://vercel.com/docs/storage/vercel-kv)
- [Vercel KV Quickstart](https://vercel.com/docs/storage/vercel-kv/quickstart)
- [Vapi API Reference](https://docs.vapi.ai/)

---

## ❓ ¿Cuál elegir?

**Responde estas preguntas:**

1. ¿Necesitas el resumen final de la llamada? → Vercel KV o Vapi API
2. ¿Necesitas la grabación? → Vercel KV o Vapi API  
3. ¿Quieres máxima simplicidad? → Tool-Calls Only
4. ¿Tienes presupuesto? → Vercel KV (mejor opción)
5. ¿MVP rápido? → Vapi API

**Mi recomendación:** Empieza con **Vapi API** (más simple), luego migra a **Vercel KV** si necesitas más control.

