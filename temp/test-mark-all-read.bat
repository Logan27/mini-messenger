@echo off
echo Testing mark all notifications read...

REM Login
curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d "{\"identifier\":\"admin\",\"password\":\"change_this_admin_password\"}" > temp_login.json

REM Extract token
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content temp_login.json | ConvertFrom-Json).data.tokens.accessToken"') do set TOKEN=%%i
echo Token: %TOKEN:~0,40%...

REM Test mark all read
echo.
echo Testing PUT /api/notifications/mark-all-read...
curl -v -X PUT http://localhost:4000/api/notifications/mark-all-read -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{}" 2>&1

del temp_login.json 2>nul
