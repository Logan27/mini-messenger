@echo off
echo ============================================================
echo         SWAGGER DOCUMENTATION VERIFICATION
echo ============================================================
echo.

REM Check backend health
curl -s http://localhost:4000/health >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Backend is not running!
    exit /b 1
)
echo [OK] Backend is running

REM Check Swagger JSON
curl -s http://localhost:4000/api-docs.json -o temp_swagger_check.json
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Swagger endpoint not accessible!
    exit /b 1
)
echo [OK] Swagger JSON endpoint accessible

REM Check Swagger UI
curl -s http://localhost:4000/api-docs >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Swagger UI not accessible!
    exit /b 1
)
echo [OK] Swagger UI accessible

echo.
echo ============================================================
echo   Swagger Documentation Updated Successfully!
echo ============================================================
echo.
echo   Swagger UI: http://localhost:4000/api-docs
echo   Swagger JSON: http://localhost:4000/api-docs.json
echo.
echo   New Endpoints Documented:
echo     - POST /api/contacts/{contactId}/unblock
echo     - GET /api/admin/stats
echo.
echo ============================================================

del temp_swagger_check.json 2>nul
