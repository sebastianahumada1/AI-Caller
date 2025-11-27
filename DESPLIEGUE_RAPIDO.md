# 🚀 Despliegue Rápido en Vercel

## ⚠️ IMPORTANTE: Persistencia en Vercel

**Vercel es serverless y no tiene persistencia entre webhooks.**

El código actual usa estado en memoria (`Set`, `Map`) que **se pierde** entre invocaciones. 

📖 **Lee `SOLUCIONES_PERSISTENCIA_VERCEL.md`** para entender las opciones:
- ✅ Vercel KV (Redis) - Recomendada
- ✅ Vapi API - Más simple
- ✅ Tool-Calls Only - Sin esperar call.ended

**Continúa con el despliegue básico, luego implementa persistencia.**

---

## ✅ Pre-requisitos Completados

Tu código está **100% listo** para desplegar en Vercel. Todos los archivos de configuración están en su lugar.

## 📝 Paso a Paso (5 minutos)

### 1️⃣ Verificar que todo esté listo

```bash
npm run vercel:check
```

Deberías ver: ✅ **Todo listo para desplegar en Vercel!**

### 2️⃣ Subir tu código a GitHub (si aún no lo has hecho)

```bash
git add .
git commit -m "Configuración completa para Vercel"
git push origin main
```

### 3️⃣ Desplegar en Vercel

**Opción A: Desde la Web (Más fácil)**

1. Ve a https://vercel.com y haz login
2. Click en **"Add New Project"**
3. Importa tu repositorio de GitHub
4. Vercel detectará la configuración automáticamente
5. Click en **"Deploy"**

**Opción B: Desde la Terminal**

```bash
# Instalar Vercel CLI (solo una vez)
npm install -g vercel

# Login
vercel login

# Desplegar
vercel --prod
```

### 4️⃣ Configurar Variables de Entorno

En tu dashboard de Vercel:

1. Ve a **Settings** → **Environment Variables**
2. Agrega las siguientes variables:

#### ✅ Obligatorias:
```
WEBHOOK_TOKEN=tu_token_secreto
VAPI_API_KEY=tu_api_key_de_vapi
GHL_API_KEY=tu_api_key_de_ghl
```

#### 🔧 Opcionales (para múltiples clientes):
```
GHL_API_KEY_SECONDARY=segunda_api_key
GHL_API_KEY_THIRD=tercera_api_key
GHL_API_KEY_FOURTH=cuarta_api_key
```

#### 📢 Para Slack (opcional):
```
SLACK_BOT_TOKEN=xoxb-tu-token
SLACK_CHANNEL_ID=C123456789
```

#### 🔗 Webhooks de GHL (opcional):
```
GHL_INCOMING_WEBHOOK_URL_DEFAULT=https://...
GHL_INCOMING_WEBHOOK_URL_BOOKING=https://...
GHL_INCOMING_WEBHOOK_URL_DEPOSIT=https://...
```

3. Después de agregar las variables, **Redesplega** el proyecto:
   - Ve a **Deployments**
   - Click en los 3 puntos del último deployment
   - Click en **"Redeploy"**

### 5️⃣ Verificar el Despliegue

Tu app estará disponible en: `https://tu-proyecto.vercel.app`

Prueba estos endpoints:

- **Dashboard**: `https://tu-proyecto.vercel.app/`
- **Health Check**: `https://tu-proyecto.vercel.app/health`
- **Debug Env**: `https://tu-proyecto.vercel.app/debug/env`
- **Network Test**: `https://tu-proyecto.vercel.app/debug/network`

### 6️⃣ Configurar Vapi

1. Ve a tu dashboard de Vapi
2. Configura el webhook URL:
   ```
   https://tu-proyecto.vercel.app/vapi/webhook
   ```
3. Agrega el header de autorización:
   ```
   Authorization: Bearer tu_webhook_token
   ```

## 🎉 ¡Listo!

Tu aplicación ya está corriendo en Vercel. Cada vez que hagas push a GitHub, Vercel la actualizará automáticamente.

## 🔍 Comandos Útiles

```bash
# Verificar que todo esté listo
npm run vercel:check

# Compilar localmente
npm run build

# Ver logs en tiempo real
vercel logs --follow

# Ver info del proyecto
vercel inspect
```

## 🆘 ¿Problemas?

Lee la guía completa en: **VERCEL_DEPLOY.md**

### Errores Comunes:

**"Module not found"**
```bash
npm run build
git add dist/
git commit -m "Add build files"
git push
```

**"Unauthorized" en webhook**
- Verifica que el token en Vapi coincida con `WEBHOOK_TOKEN` en Vercel

**Variables de entorno no funcionan**
- Asegúrate de redesplegar después de agregar variables
- Verifica que estén en "Production" environment

---

## 📚 Más Información

- Guía completa: `VERCEL_DEPLOY.md`
- Configuración de clientes: `CLIENTS_CONFIG.md`
- Integración Slack: `SLACK_INTEGRATION.md`
- Documentación Vercel: https://vercel.com/docs

---

**¿Preguntas?** Revisa los logs en el Dashboard de Vercel → Logs

