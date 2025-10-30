@echo off
echo.
echo =====================================
echo   VowsSite Server Startup
echo =====================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [1/3] Installing dependencies...
    call npm install
    echo.
) else (
    echo [1/3] Dependencies already installed
    echo.
)

REM Check if .env exists
if not exist ".env" (
    echo [2/3] WARNING: .env file not found!
    echo Please create .env file with VOWS_DATABASE_URL
    echo See .env.example for reference
    echo.
    pause
    exit /b 1
) else (
    echo [2/3] Environment configuration found
    echo.
)

echo [3/3] Starting VowsSite API server...
echo.
echo Server will be available at:
echo   - Guest Display: http://localhost:3001/
echo   - Admin Panel:   http://localhost:3001/admin
echo.
echo Press Ctrl+C to stop the server
echo.

node vows-api.js
