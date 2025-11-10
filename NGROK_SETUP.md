# 🌐 Configuración de ngrok con Docker

Este proyecto incluye integración con ngrok para exponer tu servidor local a internet de forma segura.

## 📋 Requisitos Previos

1. Cuenta de ngrok (gratis): https://ngrok.com/signup
2. Docker y Docker Compose instalados

## 🚀 Configuración Rápida

### Paso 1: Obtén tu Auth Token de ngrok

1. Regístrate en https://ngrok.com
2. Ve a tu dashboard: https://dashboard.ngrok.com/get-started/your-authtoken
3. Copia tu authtoken

### Paso 2: Crea tu archivo de configuración

```bash
# Copia el archivo de ejemplo
cp ngrok.yml.example ngrok.yml

# Edita el archivo y reemplaza YOUR_NGROK_AUTH_TOKEN_HERE con tu token
nano ngrok.yml
# o
code ngrok.yml
```

Tu `ngrok.yml` debería verse así:

```yaml
version: "2"
authtoken: tu_token_real_aqui_sin_comillas

tunnels:
  vapi-webhook:
    addr: vapi-ghl-connector:3000
    proto: http
    inspect: true
```

### Paso 3: Levanta los contenedores

```bash
# Detén cualquier contenedor anterior
docker-compose -f docker-compose.dev.yml down

# Levanta los contenedores con ngrok
docker-compose -f docker-compose.dev.yml up -d

# Espera unos segundos y verifica los logs
docker-compose -f docker-compose.dev.yml logs ngrok
```

## 🔗 Accediendo a tu Túnel

### Opción 1: Ver logs de ngrok

```bash
docker-compose -f docker-compose.dev.yml logs -f ngrok
```

Busca una línea como:
```
started tunnel    url=https://xxxx-xx-xx-xx-xx.ngrok-free.app
```

### Opción 2: Acceder a la Web UI de ngrok

Abre en tu navegador:
```
http://localhost:4040
```

Aquí verás:
- 🔗 Tu URL pública de ngrok
- 📊 Todas las peticiones HTTP en tiempo real
- 🔍 Detalles de cada request/response
- 📈 Estadísticas de uso

## 📡 Configurando Vapi

Una vez que tengas tu URL de ngrok, configúrala en Vapi:

```
URL del Webhook: https://tu-url-de-ngrok.ngrok-free.app/vapi/webhook?token=TU_WEBHOOK_TOKEN
```

Reemplaza:
- `tu-url-de-ngrok.ngrok-free.app` con tu URL real de ngrok
- `TU_WEBHOOK_TOKEN` con tu token del archivo `.env`

## 🛠️ Comandos Útiles

### Ver todos los contenedores
```bash
docker-compose -f docker-compose.dev.yml ps
```

### Ver logs en tiempo real
```bash
# Logs de tu aplicación
docker-compose -f docker-compose.dev.yml logs -f vapi-ghl-connector

# Logs de ngrok
docker-compose -f docker-compose.dev.yml logs -f ngrok

# Todos los logs
docker-compose -f docker-compose.dev.yml logs -f
```

### Reiniciar solo ngrok
```bash
docker-compose -f docker-compose.dev.yml restart ngrok
```

### Detener todo
```bash
docker-compose -f docker-compose.dev.yml down
```

### Reconstruir y reiniciar
```bash
docker-compose -f docker-compose.dev.yml up --build -d
```

## 🔒 Seguridad

### Agregar autenticación básica (opcional)

Edita tu `ngrok.yml`:

```yaml
tunnels:
  vapi-webhook:
    addr: vapi-ghl-connector:3000
    proto: http
    inspect: true
    auth: "usuario:contraseña"
```

### Usar dominio personalizado (requiere plan de pago)

```yaml
tunnels:
  vapi-webhook:
    addr: vapi-ghl-connector:3000
    proto: http
    inspect: true
    domain: tu-dominio.ngrok-free.app
```

## 🐛 Troubleshooting

### Error: "authtoken not found"

**Problema:** No has configurado tu authtoken correctamente.

**Solución:**
1. Verifica que copiaste el archivo: `cp ngrok.yml.example ngrok.yml`
2. Edita `ngrok.yml` y agrega tu token real
3. Reinicia los contenedores: `docker-compose -f docker-compose.dev.yml restart ngrok`

### Error: "tunnel not found"

**Problema:** El contenedor de ngrok no puede conectarse a tu aplicación.

**Solución:**
1. Verifica que tu aplicación esté corriendo: `docker-compose -f docker-compose.dev.yml ps`
2. Verifica el health check: `docker-compose -f docker-compose.dev.yml logs vapi-ghl-connector`
3. Espera a que el health check pase (puede tomar 40 segundos)

### No veo la URL de ngrok en los logs

**Solución:**
```bash
# Accede a la web UI
open http://localhost:4040

# O verifica el status del contenedor
docker-compose -f docker-compose.dev.yml exec ngrok ngrok api tunnels
```

### El puerto 4040 ya está en uso

**Problema:** Ya tienes ngrok corriendo localmente.

**Solución:**
```bash
# Detén ngrok local
pkill ngrok

# O cambia el puerto en docker-compose.dev.yml:
ports:
  - "4041:4040"  # Usa 4041 en lugar de 4040
```

## 📊 Verificación

Para verificar que todo está funcionando:

```bash
# 1. Verifica que los contenedores estén corriendo
docker-compose -f docker-compose.dev.yml ps

# 2. Verifica el health check
curl http://localhost:3000/health

# 3. Accede a la web UI de ngrok
open http://localhost:4040

# 4. Prueba tu webhook desde ngrok
# Copia la URL de ngrok y prueba:
curl https://tu-url-ngrok.ngrok-free.app/health
```

## 🎯 Ventajas de esta Configuración

✅ **Automático**: ngrok se inicia automáticamente con tu aplicación
✅ **Integrado**: Todo en un solo comando `docker-compose up`
✅ **Persistente**: La URL se mantiene mientras los contenedores estén corriendo
✅ **Monitoreo**: Web UI en http://localhost:4040 para ver todas las peticiones
✅ **Hot Reload**: Los cambios en tu código se reflejan automáticamente
✅ **Portable**: Funciona igual en cualquier máquina con Docker

## 📚 Recursos Adicionales

- [Documentación de ngrok](https://ngrok.com/docs)
- [ngrok Dashboard](https://dashboard.ngrok.com)
- [Planes de ngrok](https://ngrok.com/pricing)
- [Docker Compose Docs](https://docs.docker.com/compose/)

