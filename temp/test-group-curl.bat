@echo off
echo Logging in...
curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d "{\"identifier\":\"admin\",\"password\":\"change_this_admin_password\"}" > temp_admin_login.json

echo.
echo Extracting token...
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content temp_admin_login.json | ConvertFrom-Json).data.tokens.accessToken"') do set TOKEN=%%i
echo Token: %TOKEN:~0,40%...

echo.
echo Creating group...
curl -v -X POST http://localhost:4000/api/groups -H "Authorization: Bearer %TOKEN%" -H "Content-Type: application/json" -d "{\"name\":\"Test Group\",\"description\":\"Test\",\"groupType\":\"private\"}" 2>&1

del temp_admin_login.json 2>nul
