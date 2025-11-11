# Docker Setup para Vapi ↔ GHL Connector

Esta guía te ayudará a ejecutar la aplicación usando Docker y Docker Compose.

## Archivos de Docker

- `Dockerfile` - Imagen de producción optimizada
- `Dockerfile.dev` - Imagen de desarrollo con hot-reload
- `docker-compose.yml` - Configuración de producción
- `docker-compose.dev.yml` - Configuración de desarrollo
- `.dockerignore` - Archivos excluidos de la imagen

## Comandos Rápidos

### Desarrollo con Hot-reload
```bash
# Iniciar en modo desarrollo
npm run docker:dev

# Detener
npm run docker:down:dev
```

### Producción
```bash
# Iniciar en modo producción
npm run docker:prod

# Detener
npm run docker:down
```

### Comandos Docker Directos

#### Construir imagen
```bash
npm run docker:build
```

#### Ejecutar contenedor
```bash
npm run docker:run
```

## Configuración Detallada

### 1. Desarrollo con Docker

Para desarrollo con hot-reload (cambios en tiempo real):

```bash
docker-compose -f docker-compose.dev.yml up --build
```

**Características:**
- Hot-reload automático con `tsx watch`
- Volúmenes montados para cambios en tiempo real
- Incluye todas las dependencias de desarrollo
- Puerto 3000 expuesto

### 2. Producción con Docker

Para ejecutar en producción:

```bash
docker-compose up --build
```

**Características:**
- Solo dependencias de producción
- Código compilado con TypeScript
- Health checks incluidos
- Reinicio automático
- Volúmenes para persistencia de logs

### 3. Variables de Entorno

Asegúrate de tener un archivo `.env` con las siguientes variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Webhook Security
WEBHOOK_TOKEN=your_secure_webhook_token_here

# CORS Configuration
CORS_ORIGIN=*

# GHL Incoming Webhook URLs
GHL_INCOMING_WEBHOOK_URL_DEFAULT=https://services.leadconnectorhq.com/hooks/your_default_webhook_id
GHL_INCOMING_WEBHOOK_URL_BOOKING=https://services.leadconnectorhq.com/hooks/your_booking_webhook_id
GHL_INCOMING_WEBHOOK_URL_DEPOSIT=https://services.leadconnectorhq.com/hooks/your_deposit_webhook_id
```

### 4. Comandos Útiles

#### Ver logs
```bash
# Desarrollo
docker-compose -f docker-compose.dev.yml logs -f

# Producción
docker-compose logs -f
```

#### Entrar al contenedor
```bash
# Desarrollo
docker-compose -f docker-compose.dev.yml exec vapi-ghl-connector sh

# Producción
docker-compose exec vapi-ghl-connector sh
```

#### Ver estado de los contenedores
```bash
docker-compose ps
```

#### Reconstruir sin caché
```bash
docker-compose build --no-cache
```

### 5. Health Checks

La aplicación incluye health checks que verifican el endpoint `/health`:

- **Intervalo**: 30 segundos
- **Timeout**: 10 segundos
- **Reintentos**: 3
- **Período de inicio**: 40 segundos

### 6. Volúmenes

#### Desarrollo
- Código fuente montado para hot-reload
- `node_modules` excluido para evitar conflictos
- Directorio `storage` persistente

#### Producción
- Solo directorio `storage` persistente
- Código compilado dentro de la imagen

### 7. Puertos

- **Puerto expuesto**: 3000
- **Mapeo**: `3000:3000` (host:container)

### 8. Troubleshooting

#### Problema: Puerto ya en uso
```bash
# Cambiar puerto en docker-compose.yml
ports:
  - "3001:3000"  # Usar puerto 3001 en el host
```

#### Problema: Permisos de archivos
```bash
# En Linux/Mac, ajustar permisos
sudo chown -R $USER:$USER storage/
```

#### Problema: Variables de entorno no cargadas
```bash
# Verificar que el archivo .env existe
ls -la .env

# Ver variables en el contenedor
docker-compose exec vapi-ghl-connector env
```

#### Problema: Imagen no se actualiza
```bash
# Reconstruir sin caché
docker-compose build --no-cache
docker-compose up --force-recreate
```

### 9. Integración con ngrok

Para desarrollo con ngrok y Docker:

```bash
# Terminal 1: Iniciar aplicación en Docker
npm run docker:dev

# Terminal 2: Iniciar ngrok
ngrok http 3000
```

### 10. Monitoreo

#### Ver métricas del contenedor
```bash
docker stats vapi-ghl-connector
```

#### Ver logs en tiempo real
```bash
docker-compose logs -f --tail=100
```

#### Verificar health check
```bash
curl http://localhost:3000/health
```

## Próximos Pasos

1. **Configurar variables de entorno** en `.env`
2. **Ejecutar en desarrollo**: `npm run docker:dev`
3. **Probar la aplicación**: `curl http://localhost:3000/health`
4. **Configurar ngrok** si es necesario
5. **Desplegar en producción** cuando esté listo

## Notas Importantes

- El directorio `storage` se monta como volumen para persistir logs
- En desarrollo, los cambios en el código se reflejan automáticamente
- En producción, el código se compila en la imagen
- Los health checks ayudan a monitorear la salud de la aplicación
- Usa `docker-compose down` para limpiar contenedores y volúmenes
