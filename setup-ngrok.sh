#!/bin/bash

# Script para configurar ngrok con Docker
# Uso: ./setup-ngrok.sh

set -e

echo "🌐 Configuración de ngrok para Docker"
echo "======================================"
echo ""

# Verificar si ngrok.yml existe
if [ -f "ngrok.yml" ]; then
    echo "✅ Archivo ngrok.yml encontrado"
    
    # Verificar si tiene el token placeholder
    if grep -q "YOUR_NGROK_AUTH_TOKEN_HERE" ngrok.yml; then
        echo "⚠️  Advertencia: ngrok.yml contiene el token placeholder"
        echo ""
        echo "Por favor, edita ngrok.yml y reemplaza YOUR_NGROK_AUTH_TOKEN_HERE"
        echo "con tu token real de ngrok."
        echo ""
        echo "Obtén tu token en: https://dashboard.ngrok.com/get-started/your-authtoken"
        echo ""
        read -p "¿Quieres abrir el archivo ahora? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ${EDITOR:-nano} ngrok.yml
        fi
        exit 1
    else
        echo "✅ Token configurado en ngrok.yml"
    fi
else
    echo "❌ Archivo ngrok.yml no encontrado"
    echo ""
    echo "Creando ngrok.yml desde la plantilla..."
    
    if [ -f "ngrok.yml.example" ]; then
        cp ngrok.yml.example ngrok.yml
        echo "✅ Archivo ngrok.yml creado"
        echo ""
        echo "⚠️  IMPORTANTE: Debes editar ngrok.yml y agregar tu authtoken"
        echo ""
        echo "1. Ve a: https://dashboard.ngrok.com/get-started/your-authtoken"
        echo "2. Copia tu authtoken"
        echo "3. Edita ngrok.yml y reemplaza YOUR_NGROK_AUTH_TOKEN_HERE"
        echo ""
        read -p "¿Quieres abrir el archivo ahora? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ${EDITOR:-nano} ngrok.yml
        fi
        exit 1
    else
        echo "❌ ngrok.yml.example no encontrado"
        exit 1
    fi
fi

echo ""
echo "🐳 Iniciando contenedores Docker con ngrok..."
echo ""

# Detener contenedores existentes
docker-compose -f docker-compose.dev.yml down 2>/dev/null || true

# Levantar contenedores
docker-compose -f docker-compose.dev.yml up -d

echo ""
echo "⏳ Esperando a que los servicios estén listos..."
sleep 5

# Verificar estado
echo ""
echo "📊 Estado de los contenedores:"
docker-compose -f docker-compose.dev.yml ps

echo ""
echo "✅ ¡Configuración completada!"
echo ""
echo "🔗 Accede a la Web UI de ngrok:"
echo "   http://localhost:4040"
echo ""
echo "📡 Para ver la URL pública de ngrok:"
echo "   docker-compose -f docker-compose.dev.yml logs ngrok | grep 'started tunnel'"
echo ""
echo "📋 Para ver logs en tiempo real:"
echo "   docker-compose -f docker-compose.dev.yml logs -f"
echo ""
echo "🛑 Para detener todo:"
echo "   docker-compose -f docker-compose.dev.yml down"
echo ""

