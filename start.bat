@echo off
setlocal

echo =========================================
echo       GeoLead Scraper Startup Tool
echo =========================================
echo.

:: Define paths
set "API_ENV_FILE=apps\api\.env"
set "WEB_ENV_FILE=apps\web\.env"

:: Check and create API .env if missing
if not exist "%API_ENV_FILE%" (
    echo [INFO] Creating missing %API_ENV_FILE%...
    echo # Geolead API Configuration> "%API_ENV_FILE%"
    echo MONGODB_URI=mongodb://geolead_admin:geoleadadminpassword123@44.222.102.62:27017/geolead?authSource=admin>> "%API_ENV_FILE%"
    echo MONGODB_DB_NAME=geolead_db>> "%API_ENV_FILE%"
    echo.>> "%API_ENV_FILE%"
    echo OLLAMA_HOST=http://127.0.0.1:11434>> "%API_ENV_FILE%"
    echo OLLAMA_MODEL=qwen2.5:7b>> "%API_ENV_FILE%"
    echo.>> "%API_ENV_FILE%"
    echo API_PORT=4000>> "%API_ENV_FILE%"
    echo CORS_ORIGINS=http://localhost:3000>> "%API_ENV_FILE%"
    echo.>> "%API_ENV_FILE%"
    echo ENABLE_CLOUD_SYNC=false>> "%API_ENV_FILE%"
    echo [SUCCESS] %API_ENV_FILE% created.
) else (
    echo [OK] %API_ENV_FILE% already exists.
)

:: Check and create Web .env if missing
if not exist "%WEB_ENV_FILE%" (
    echo [INFO] Creating missing %WEB_ENV_FILE%...
    echo # Geolead Web Configuration> "%WEB_ENV_FILE%"
    echo NEXT_PUBLIC_API_URL=http://localhost:4000>> "%WEB_ENV_FILE%"
    echo [SUCCESS] %WEB_ENV_FILE% created.
) else (
    echo [OK] %WEB_ENV_FILE% already exists.
)

echo.
echo =========================================
echo Starting services in separate windows...
echo =========================================

:: Ensure dependencies are installed just in case it's a completely fresh clone
echo [INFO] Ensuring dependencies are installed...
call pnpm install

:: Start API in a new window
echo [INFO] Launching API Server...
start "GeoLead API (Backend)" cmd /k "cd apps\api && pnpm dev"

:: Start Web in a new window
echo [INFO] Launching Web Frontend...
start "GeoLead Web (Frontend)" cmd /k "cd apps\web && pnpm dev"

echo.
echo [DONE] Both services should now be running in their own windows!
echo Close this window at any time. (Keep the other windows open to run the app)
pause
