@echo off
setlocal enabledelayedexpansion

set API_URL=http://localhost:4000

REM ANSI Color codes
for /F "tokens=1,2 delims=#" %%a in ('"prompt #$H#$E# & echo on & for %%b in (1) do rem"') do (
  set ESC=%%b
)
set "RED=!ESC![91m"
set "GREEN=!ESC![92m"
set "YELLOW=!ESC![93m"
set "RESET=!ESC![0m"

echo.
echo ============================================================================
echo Testing Password Change Fix
echo ============================================================================
echo.

REM Generate unique ID for test user
for /f "delims=" %%a in ('powershell -NoProfile -Command "[int](Get-Date -UFormat %%s)"') do set PWD_ID=%%a

echo [1] Creating test user for password change...
echo {"username":"pwduser!PWD_ID!","email":"pwduser!PWD_ID!@test.com","password":"Test123456#","firstName":"Password","lastName":"User"} > temp_pwdreg.json
curl -s -o temp_pwdreg_result.json -w "%%{http_code}" -X POST "%API_URL%/api/auth/register" ^
  -H "Content-Type: application/json" ^
  -d @temp_pwdreg.json > temp_status.txt
set /p HTTP_STATUS=<temp_status.txt
echo Registration: HTTP !HTTP_STATUS!
del temp_pwdreg.json temp_pwdreg_result.json temp_status.txt 2>nul

echo.
echo [2] Logging in as test user...
echo {"identifier":"pwduser!PWD_ID!@test.com","password":"Test123456#"} > temp_pwdlogin.json
curl -s -o temp_pwdlog.json -w "%%{http_code}" -X POST "%API_URL%/api/auth/login" ^
  -H "Content-Type: application/json" ^
  -d @temp_pwdlogin.json > temp_status.txt
set /p HTTP_STATUS=<temp_status.txt
echo Login: HTTP !HTTP_STATUS!

for /f "delims=" %%i in ('powershell -NoProfile -Command "try { (Get-Content temp_pwdlog.json | ConvertFrom-Json).data.tokens.accessToken } catch { '' }"') do set PWD_TOKEN=%%i
if defined PWD_TOKEN (
    echo Token: !PWD_TOKEN:~0,50!...
) else (
    echo !RED!ERROR: Failed to get access token!RESET!
    del temp_pwdlogin.json temp_pwdlog.json temp_status.txt 2>nul
    exit /b 1
)
del temp_pwdlogin.json temp_pwdlog.json temp_status.txt 2>nul

echo.
echo [3] Testing password change...
echo {"currentPassword":"Test123456#","newPassword":"NewTest123456#","confirmPassword":"NewTest123456#"} > temp_change_req.json
curl -s -o temp_change.json -w "%%{http_code}" -X POST "%API_URL%/api/auth/change-password" ^
  -H "Authorization: Bearer !PWD_TOKEN!" ^
  -H "Content-Type: application/json" ^
  -d @temp_change_req.json > temp_status.txt
set /p HTTP_STATUS=<temp_status.txt

echo.
if "!HTTP_STATUS!"=="200" (
    echo !GREEN!✓ SUCCESS!RESET! - Password change successful [HTTP !HTTP_STATUS!]
    echo.
    echo Response:
    type temp_change.json
    echo.
) else (
    echo !RED!✗ FAILED!RESET! - Password change failed [HTTP !HTTP_STATUS!]
    echo.
    echo Response:
    type temp_change.json
    echo.
    echo.
    echo Checking backend logs for errors...
    docker logs messenger-backend 2>&1 | findstr /C:"change-password" | findstr /C:"error" /I
)

del temp_change_req.json temp_change.json temp_status.txt 2>nul

echo.
echo ============================================================================
echo Test Complete
echo ============================================================================
