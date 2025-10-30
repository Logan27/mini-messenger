@echo off
echo Testing Admin Login...
echo.

echo Creating request file...
echo {"identifier":"admin","password":"change_this_admin_password"} > temp_admin_test.json

echo.
echo Sending login request...
curl -v -X POST http://localhost:4000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d @temp_admin_test.json > temp_admin_response.json 2>&1

echo.
echo Response:
type temp_admin_response.json
echo.

echo.
echo Extracting token...
powershell -NoProfile -Command "$j = Get-Content temp_admin_test.json | ConvertFrom-Json; Write-Host 'Request:' $j.identifier $j.password"
powershell -NoProfile -Command "if (Test-Path temp_admin_response.json) { try { $j = Get-Content temp_admin_response.json | ConvertFrom-Json; Write-Host 'Token:' $j.data.tokens.accessToken.Substring(0,50) } catch { Write-Host 'ERROR parsing JSON' } }"

del temp_admin_test.json temp_admin_response.json 2>nul
