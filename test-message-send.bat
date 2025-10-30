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
echo Testing Message Send Issue
echo ============================================================================
echo.

REM Generate unique IDs
for /f "delims=" %%a in ('powershell -NoProfile -Command "[int](Get-Date -UFormat %%s)"') do set UNIQUE_ID=%%a

echo [1] Creating User 1...
echo {"username":"msgtest1!UNIQUE_ID!","email":"msgtest1!UNIQUE_ID!@test.com","password":"Test123456#","firstName":"Msg","lastName":"User1"} > temp_reg1.json
curl -s -o temp_reg1_result.json -w "%%{http_code}" -X POST "%API_URL%/api/auth/register" ^
  -H "Content-Type: application/json" ^
  -d @temp_reg1.json > temp_status.txt
set /p HTTP_STATUS=<temp_status.txt
echo User1 Registration: HTTP !HTTP_STATUS!

echo [2] Logging in as User 1...
echo {"identifier":"msgtest1!UNIQUE_ID!@test.com","password":"Test123456#"} > temp_login1.json
curl -s -o temp_log1.json -w "%%{http_code}" -X POST "%API_URL%/api/auth/login" ^
  -H "Content-Type: application/json" ^
  -d @temp_login1.json > temp_status.txt
set /p HTTP_STATUS=<temp_status.txt
echo User1 Login: HTTP !HTTP_STATUS!

for /f "delims=" %%i in ('powershell -NoProfile -Command "try { (Get-Content temp_log1.json | ConvertFrom-Json).data.tokens.accessToken } catch { '' }"') do set TOKEN1=%%i
for /f "delims=" %%i in ('powershell -NoProfile -Command "try { (Get-Content temp_log1.json | ConvertFrom-Json).data.user.id } catch { '' }"') do set USER1_ID=%%i
echo Token1: !TOKEN1:~0,40!...
echo User1 ID: !USER1_ID!

echo.
echo [3] Creating User 2...
echo {"username":"msgtest2!UNIQUE_ID!","email":"msgtest2!UNIQUE_ID!@test.com","password":"Test123456#","firstName":"Msg","lastName":"User2"} > temp_reg2.json
curl -s -o temp_reg2_result.json -w "%%{http_code}" -X POST "%API_URL%/api/auth/register" ^
  -H "Content-Type: application/json" ^
  -d @temp_reg2.json > temp_status.txt
set /p HTTP_STATUS=<temp_status.txt
echo User2 Registration: HTTP !HTTP_STATUS!

echo [4] Logging in as User 2...
echo {"identifier":"msgtest2!UNIQUE_ID!@test.com","password":"Test123456#"} > temp_login2.json
curl -s -o temp_log2.json -w "%%{http_code}" -X POST "%API_URL%/api/auth/login" ^
  -H "Content-Type: application/json" ^
  -d @temp_login2.json > temp_status.txt
set /p HTTP_STATUS=<temp_status.txt
echo User2 Login: HTTP !HTTP_STATUS!

for /f "delims=" %%i in ('powershell -NoProfile -Command "try { (Get-Content temp_log2.json | ConvertFrom-Json).data.tokens.accessToken } catch { '' }"') do set TOKEN2=%%i
for /f "delims=" %%i in ('powershell -NoProfile -Command "try { (Get-Content temp_log2.json | ConvertFrom-Json).data.user.id } catch { '' }"') do set USER2_ID=%%i
echo Token2: !TOKEN2:~0,40!...
echo User2 ID: !USER2_ID!

echo.
echo [5] User1 sending message to User2...
echo {"recipientId":"!USER2_ID!","content":"Test message from User1"} > temp_msg_req.json
curl -s -o temp_msg.json -w "%%{http_code}" -X POST "%API_URL%/api/messages" ^
  -H "Authorization: Bearer !TOKEN1!" ^
  -H "Content-Type: application/json" ^
  -d @temp_msg_req.json > temp_status.txt
set /p HTTP_STATUS=<temp_status.txt

echo.
if "!HTTP_STATUS!"=="201" (
    echo !GREEN!✓ SUCCESS!RESET! - Message sent [HTTP !HTTP_STATUS!]
) else (
    echo !RED!✗ FAILED!RESET! - Message send failed [HTTP !HTTP_STATUS!]
    echo.
    echo Response:
    type temp_msg.json
)

REM Cleanup
del temp_*.json temp_*.txt 2>nul

echo.
echo ============================================================================
echo Test Complete
echo ============================================================================
