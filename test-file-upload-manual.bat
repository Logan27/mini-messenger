@echo off
setlocal

REM Login
echo {"identifier":"admin","password":"admin123"} > temp_manual_login.json
curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d @temp_manual_login.json > temp_manual_token.json

REM Extract token
for /f "delims=" %%i in ('powershell -NoProfile -Command "try { (Get-Content temp_manual_token.json | ConvertFrom-Json).data.tokens.accessToken } catch { '' }"') do set TOKEN=%%i

echo Token: %TOKEN%
echo.
echo Testing file upload...
echo.

REM Upload file
curl -v -X POST "http://localhost:4000/api/files/upload" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "files=@test-files\test-image.png" > temp_manual_upload_result.txt 2>&1

echo.
type temp_manual_upload_result.txt
echo.

REM Cleanup
del temp_manual_login.json temp_manual_token.json 2>nul

pause
