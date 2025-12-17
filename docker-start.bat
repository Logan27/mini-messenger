@echo off
REM Messenger Application - Docker Start Script (Windows)

echo ======================================
echo   Messenger Application - Docker
echo ======================================
echo.

REM Check if .env exists
if not exist .env (
    echo [WARNING] .env file not found
    echo Creating .env from .env.example...
    copy .env.example .env
    echo.
    echo [IMPORTANT] Please edit .env file and set secure secrets before production use!
    echo Press any key to continue with default development settings...
    pause > nul
    echo.
)

echo Starting Messenger Application...
echo.

REM Start all services
docker-compose up -d

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to start services
    echo Run 'docker-compose logs' to see errors
    exit /b 1
)

echo.
echo ======================================
echo   Services Started Successfully!
echo ======================================
echo.
echo Frontend:  http://localhost:3000
echo Backend:   http://localhost:4000
echo API Docs:  http://localhost:4000/api-docs
echo Health:    http://localhost:4000/health
echo.
echo Dev Tools (optional):
echo  - pgAdmin:        http://localhost:8080
echo  - Redis Commander: http://localhost:8081
echo  (Start with: docker-compose --profile dev up -d)
echo.
echo ======================================
echo.
echo Viewing logs... (Ctrl+C to exit)
docker-compose logs -f
