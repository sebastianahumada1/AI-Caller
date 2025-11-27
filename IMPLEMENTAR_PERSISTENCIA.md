# 🔧 Cómo Implementar Persistencia en Vercel

## 📋 Resumen Ejecutivo

Ya creé el archivo `src/utils/state-storage.ts` que maneja la persistencia automáticamente:
- ✅ Usa Vercel KV en producción (si está disponible)
- ✅ Usa memoria en desarrollo local (fallback automático)
- ✅ Compatible con ambos entornos

**Estado:** Código listo, solo falta:
1. Instalar dependencia opcional
2. Crear database KV en Vercel
3. Actualizar `src/vapi.ts` para usar StateStorage
4. Redesplegar

---

## 🚀 Paso a Paso (15 minutos)

### 1️⃣ Instalar Dependencia (1 min)

```bash
npm install @vercel/kv
```

### 2️⃣ Crear Database KV en Vercel (3 min)

1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Click en **Storage** (barra lateral)
4. Click en **Create Database**
5. Selecciona **KV (Redis)**
6. Nombre: `vapi-state` (o el que quieras)
7. Click **Create**
8. Click **Connect to Project**
9. Selecciona tu proyecto
10. Click **Connect** → Las variables de entorno se agregan automáticamente

**Variables que se crean:**
```
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
KV_URL=redis://...
```

### 3️⃣ Actualizar src/vapi.ts (10 min)

Abre `src/vapi.ts` y aplica estos cambios:

#### A. Importar StateStorage

```typescript
// Agregar al inicio del archivo
import { StateStorage } from './utils/state-storage.js';
```

#### B. Actualizar el constructor

```typescript
export class VapiWebhookHandler {
  private ghlConnector: GHLConnector;
  private vapiApiClient: VapiApiClient;
  private slackService: SlackService | null;
  private stateStorage: StateStorage; // ✅ NUEVO
  
  // ❌ ELIMINAR estas líneas:
  // private sentNotes: Set<string>;
  // private callSummaries: Map<string, string>;

  constructor() {
    this.ghlConnector = new GHLConnector();
    this.vapiApiClient = new VapiApiClient();
    this.stateStorage = new StateStorage(); // ✅ NUEVO
    
    // ❌ ELIMINAR estas líneas:
    // this.sentNotes = new Set();
    // this.callSummaries = new Map();
    
    try {
      this.slackService = new SlackService();
      Logger.info('[VAPI_HANDLER] Slack integration enabled');
    } catch (error) {
      this.slackService = null;
      Logger.warn('[VAPI_HANDLER] Slack integration disabled');
    }
  }
}
```

#### C. Actualizar handleEndOfCallReport

Busca la función `handleEndOfCallReport` y reemplaza:

```typescript
// ❌ REEMPLAZAR ESTO:
if (message.call?.id && message.analysis?.summary) {
  this.callSummaries.set(message.call.id, message.analysis.summary);
  Logger.info('[END_OF_CALL] Summary stored for GHL note', {
    callId: message.call.id,
    summaryLength: message.analysis.summary.length,
  });
}

// ✅ POR ESTO:
if (message.call?.id && message.analysis?.summary) {
  await this.stateStorage.storeCallSummary(
    message.call.id, 
    message.analysis.summary
  );
}
```

#### D. Actualizar pullAndProcessGhlMetadata

Busca donde se usa `this.callSummaries.get()` y reemplaza:

```typescript
// ❌ REEMPLAZAR ESTO:
const storedSummary = this.callSummaries.get(callId);

// ✅ POR ESTO:
const storedSummary = await this.stateStorage.getCallSummary(callId);
```

#### E. Actualizar addGhlNote (si existe)

Busca donde se usa `this.sentNotes`:

```typescript
// ❌ REEMPLAZAR ESTO:
if (this.sentNotes.has(noteKey)) {
  Logger.info('[ADD_GHL_NOTE] Note already sent, skipping', { noteKey });
  return;
}
this.sentNotes.add(noteKey);

// ✅ POR ESTO:
const alreadySent = await this.stateStorage.wasNoteSent(callId, contactId);
if (alreadySent) {
  Logger.info('[ADD_GHL_NOTE] Note already sent, skipping', { callId, contactId });
  return;
}
await this.stateStorage.markNoteSent(callId, contactId);
```

### 4️⃣ Compilar y Probar Localmente (2 min)

```bash
# Compilar
npm run build

# Probar localmente (usará fallback en memoria)
npm run dev

# Verificar logs - deberías ver:
# [STATE_STORAGE] Using in-memory storage (not persistent in Vercel!)
```

### 5️⃣ Desplegar a Vercel (2 min)

```bash
git add .
git commit -m "Implementar persistencia con Vercel KV"
git push origin main
```

O si usas CLI de Vercel:

```bash
vercel --prod
```

### 6️⃣ Verificar en Producción (1 min)

1. Ve a tu URL de Vercel: `https://tu-proyecto.vercel.app/health`
2. Busca en la respuesta:
```json
{
  "status": "ok",
  "features": {
    "stateStorage": {
      "type": "Vercel KV",
      "available": true
    }
  }
}
```

3. Revisa los logs en Vercel Dashboard:
```
[STATE_STORAGE] Using Vercel KV storage
[STATE_STORAGE] Summary stored { callId: '...', storage: 'KV' }
```

---

## 🎯 Verificación de Funcionamiento

### Test 1: Guardar y Recuperar Summary

1. Envía webhook con `end-of-call-report` que incluya `analysis.summary`
2. Verifica en logs que se guardó:
```
[STATE_STORAGE] Summary stored { callId: 'xxx', storage: 'KV' }
```
3. Envía otro webhook o consulta
4. Verifica que se recuperó:
```
[STATE_STORAGE] Summary retrieved { callId: 'xxx', found: true, storage: 'KV' }
```

### Test 2: Verificar Datos en Vercel KV

1. Ve a Vercel Dashboard → Storage → tu KV database
2. Click en **Data Browser**
3. Deberías ver keys como:
   - `vapi:summary:call_123`
   - `vapi:note:call_123:contact_456`
   - `vapi:metadata:call_123`

---

## 🔍 Health Check Actualizado

Agrega verificación de StateStorage al health check en `src/server.ts`:

```typescript
app.get('/health', (_req, res) => {
  const vapiHandler = new VapiWebhookHandler();
  const storageStatus = vapiHandler.getStorageStatus(); // Método a agregar
  
  const healthInfo = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    // ... otros checks
    storage: storageStatus,
  };

  res.status(200).json(healthInfo);
});
```

Y agregar el método en `src/vapi.ts`:

```typescript
/**
 * Get storage status for health checks
 */
getStorageStatus() {
  return this.stateStorage.getStatus();
}
```

---

## 📊 Costos de Vercel KV

### Plan Gratuito (Hobby)
- ✅ 256 MB de storage
- ✅ 30,000 comandos/mes
- ✅ Suficiente para MVP y testing

### Plan Pro ($20/mes)
- ✅ 512 MB de storage
- ✅ 5M comandos/mes
- ✅ Recomendado para producción

### Estimación de Uso
- 1 llamada = ~5-10 comandos KV (store + get)
- Con plan gratuito: ~3,000-6,000 llamadas/mes
- Con plan Pro: ~500k-1M llamadas/mes

---

## 🐛 Troubleshooting

### Error: "Cannot find module '@vercel/kv'"

**En local:**
```bash
npm install @vercel/kv
```

**En Vercel:**
- El código usa fallback automático si KV no está instalado
- Logs mostrarán: `[STATE_STORAGE] Using in-memory storage`

### Error: "KV_REST_API_URL is not defined"

**Causa:** No creaste la database KV o no la conectaste al proyecto.

**Solución:**
1. Ve a Vercel Dashboard → Storage
2. Crea database KV
3. Conecta al proyecto
4. Redesplega

### Los datos no persisten entre webhooks

**Verifica:**
1. Logs muestren `storage: 'KV'` no `storage: 'memory'`
2. Variables de entorno KV estén configuradas
3. Estás en Vercel (no local)

**Debug:**
```bash
# Ver logs en tiempo real
vercel logs --follow

# Buscar mensajes de STATE_STORAGE
vercel logs | grep STATE_STORAGE
```

### TTL (Time to Live) muy corto

Por defecto es 24 horas. Para cambiar:

```typescript
// En constructor de VapiWebhookHandler
this.stateStorage = new StateStorage('vapi', 172800); // 48 horas
```

---

## ✅ Checklist Final

- [ ] `@vercel/kv` instalado (`npm install @vercel/kv`)
- [ ] Database KV creada en Vercel Dashboard
- [ ] Database conectada al proyecto
- [ ] `src/vapi.ts` actualizado (StateStorage en lugar de Set/Map)
- [ ] Código compilado sin errores (`npm run build`)
- [ ] Desplegado a Vercel (`git push` o `vercel --prod`)
- [ ] Health check muestra `storage: { type: 'Vercel KV', available: true }`
- [ ] Logs muestran `[STATE_STORAGE] Using Vercel KV storage`
- [ ] Test de webhook funciona y datos persisten

---

## 📚 Recursos

- [Vercel KV Docs](https://vercel.com/docs/storage/vercel-kv)
- [Vercel KV SDK](https://vercel.com/docs/storage/vercel-kv/kv-reference)
- [Redis Commands](https://redis.io/commands/)

---

## 🎉 ¡Listo!

Una vez completados todos los pasos, tu aplicación tendrá **persistencia completa** en Vercel y podrá:

✅ Guardar summaries de llamadas  
✅ Recuperar datos entre webhooks  
✅ Evitar notas duplicadas  
✅ Funcionar correctamente en ambiente serverless  
✅ Escalar sin problemas  

**Tu aplicación estará 100% lista para producción en Vercel.** 🚀

