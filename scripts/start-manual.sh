#!/bin/bash

echo "🚀 Starting Vapi-GHL Connector manually..."
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found"
    echo "💡 Copy env.example to .env: cp env.example .env"
    exit 1
fi

echo "✅ Starting development server..."
echo "📡 Open a new terminal and run: ngrok http 3000"
echo ""

npm run dev


