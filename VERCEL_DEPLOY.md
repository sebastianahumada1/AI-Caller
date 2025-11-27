# Guía de Despliegue en Vercel

Esta guía te ayudará a desplegar tu aplicación Vapi-GHL Connector en Vercel.

## 📋 Pre-requisitos

1. Cuenta de Vercel (gratis en https://vercel.com)
2. Proyecto conectado a GitHub (recomendado) o CLI de Vercel instalado
3. Variables de entorno configuradas

## 🚀 Método 1: Despliegue desde GitHub (Recomendado)

### Paso 1: Push tu código a GitHub

```bash
git add .
git commit -m "Configuración para Vercel"
git push origin main
```

### Paso 2: Importar en Vercel

1. Ve a https://vercel.com/new
2. Selecciona tu repositorio de GitHub
3. Vercel detectará automáticamente la configuración
4. Haz clic en "Deploy"

### Paso 3: Configurar Variables de Entorno

En el dashboard de Vercel, ve a **Settings > Environment Variables** y agrega:

#### Variables Requeridas:
```
WEBHOOK_TOKEN=tu_token_secreto_aqui
VAPI_API_KEY=tu_vapi_api_key
GHL_API_KEY=tu_ghl_api_key
```

#### Variables Opcionales:
```
GHL_API_KEY_SECONDARY=tu_segunda_api_key
GHL_API_KEY_THIRD=tu_tercera_api_key
GHL_API_KEY_FOURTH=tu_cuarta_api_key
GHL_INCOMING_WEBHOOK_URL_DEFAULT=https://...
GHL_INCOMING_WEBHOOK_URL_BOOKING=https://...
GHL_INCOMING_WEBHOOK_URL_DEPOSIT=https://...
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL_ID=C...
VAPI_API_BASE_URL=https://api.vapi.ai
CORS_ORIGIN=*
NODE_ENV=production
```

### Paso 4: Redesplegar

Después de agregar las variables de entorno:
1. Ve a la pestaña **Deployments**
2. Selecciona el último deployment
3. Haz clic en los tres puntos y selecciona **Redeploy**

## 🖥️ Método 2: Despliegue desde CLI

### Instalación de Vercel CLI

```bash
npm install -g vercel
```

### Autenticación

```bash
vercel login
```

### Despliegue

```bash
# Despliegue de prueba
vercel

# Despliegue a producción
vercel --prod
```

### Agregar Variables de Entorno desde CLI

```bash
# Agregar una variable de entorno
vercel env add WEBHOOK_TOKEN production

# Importar desde archivo .env
vercel env pull .env.production
```

## 🔍 Verificación del Despliegue

Una vez desplegado, visita tu URL de Vercel (ej: `https://tu-proyecto.vercel.app`):

1. **Dashboard Principal**: Verifica que todos los servicios estén en verde
2. **Health Check**: Visita `/health` para ver el estado del sistema
3. **Debug Environment**: Visita `/debug/env` para verificar las variables
4. **Network Test**: Visita `/debug/network` para probar conectividad

## 📡 Configurar Webhook en Vapi

1. Ve a tu dashboard de Vapi
2. Configura el webhook URL: `https://tu-proyecto.vercel.app/vapi/webhook`
3. Agrega el header de autorización: `Bearer tu_webhook_token`

## 🔧 Configuración de Vercel

El proyecto incluye estos archivos de configuración:

### `vercel.json`
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "functions": {
    "api/**/*.js": {
      "memory": 1024,
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api/index.js"
    }
  ]
}
```

### Estructura de Archivos
```
/
├── api/
│   └── index.js          # Punto de entrada de Vercel
├── src/                  # Código fuente TypeScript
│   ├── server.ts         # Aplicación Express principal
│   ├── vapi.ts
│   ├── ghl.ts
│   └── utils/
├── dist/                 # Código compilado (generado)
├── package.json
├── tsconfig.json
└── vercel.json
```

## 🐛 Resolución de Problemas

### Error: "Module not found"

**Causa**: El build no se completó correctamente.

**Solución**:
```bash
# Limpia y reconstruye localmente
rm -rf dist node_modules
npm install
npm run build
vercel --prod
```

### Error: "Function execution timeout"

**Causa**: La función tarda más de 10 segundos (límite del plan gratuito).

**Solución**: 
- Actualiza a Vercel Pro para límites más altos
- O optimiza el código para que sea más rápido

### Error: Variables de entorno no están disponibles

**Causa**: Las variables no están configuradas o no se redesplego después de agregarlas.

**Solución**:
1. Verifica en Settings > Environment Variables
2. Asegúrate de seleccionar "Production" al agregar variables
3. Redesplega el proyecto

### Webhooks no llegan

**Causa**: URL incorrecta o token de autorización mal configurado.

**Solución**:
1. Verifica que la URL en Vapi sea correcta: `https://tu-proyecto.vercel.app/vapi/webhook`
2. Verifica el header: `Authorization: Bearer tu_webhook_token`
3. Revisa los logs en Vercel Dashboard > Logs

## 📊 Monitoreo

### Logs en Tiempo Real
```bash
vercel logs --follow
```

### Ver logs de un deployment específico
```bash
vercel logs [deployment-url]
```

### Dashboard de Vercel
- **Analytics**: Uso y rendimiento
- **Logs**: Logs de función en tiempo real
- **Insights**: Métricas de velocidad

## 🔒 Seguridad

1. **Nunca** commitees archivos `.env` a Git
2. Usa tokens seguros y aleatorios para `WEBHOOK_TOKEN`
3. Configura `CORS_ORIGIN` a tu dominio específico en producción
4. Revisa regularmente los logs para detectar accesos no autorizados

## 🔄 Actualizaciones Automáticas

Vercel redesplega automáticamente cuando:
- Haces push a la rama principal en GitHub
- Cambias variables de entorno y redesplegas manualmente

## 📚 Recursos Adicionales

- [Documentación de Vercel](https://vercel.com/docs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

## ✅ Checklist de Despliegue

- [ ] Código pusheado a GitHub
- [ ] Proyecto importado en Vercel
- [ ] Variables de entorno configuradas
- [ ] Deployment exitoso (verde)
- [ ] Dashboard muestra "System Online"
- [ ] `/health` retorna status: ok
- [ ] Webhook URL configurada en Vapi
- [ ] Token de autorización configurado
- [ ] Test de webhook exitoso
- [ ] Logs no muestran errores

---

**¡Listo!** Tu aplicación Vapi-GHL Connector debería estar funcionando en Vercel. 🎉

