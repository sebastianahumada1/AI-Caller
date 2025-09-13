@echo off
echo 🚀 Starting Vapi-GHL Connector manually...
echo.

REM Check if .env file exists
if not exist ".env" (
    echo ❌ .env file not found
    echo 💡 Copy env.example to .env: copy env.example .env
    pause
    exit /b 1
)

echo ✅ Starting development server...
echo 📡 Open a new terminal and run: ngrok http 3000
echo.

npm run dev

