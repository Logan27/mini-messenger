@echo off
echo ==========================================
echo Testing Migration 025 - camelCase Database
echo ==========================================
echo.

set BASE_URL=http://localhost:4000/api

REM Step 1: Login as testusera2
echo [Step 1] Logging in as testusera2...
curl -s -X POST "%BASE_URL%/auth/login" -H "Content-Type: application/json" -d "{\"identifier\":\"usera2@test.com\",\"password\":\"TestPass123@\"}" > temp_login.json

for /f "tokens=*" %%i in ('powershell -Command "(Get-Content temp_login.json | ConvertFrom-Json).data.tokens.accessToken"') do set TOKEN=%%i

if "%TOKEN%"=="" (
    echo ERROR: Failed to get token
    type temp_login.json
    pause
    exit /b 1
)

echo SUCCESS: Token obtained
echo.

REM Step 2: Send a test message
echo [Step 2] Sending test message...
curl -s -X POST "%BASE_URL%/messages" -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN%" -d "{\"recipientId\":\"test-recipient-id\",\"content\":\"Test message after migration 025\"}" > temp_message.json

echo Response:
type temp_message.json
echo.
echo.

REM Step 3: Get contacts
echo [Step 3] Getting contacts...
curl -s -X GET "%BASE_URL%/contacts" -H "Authorization: Bearer %TOKEN%" > temp_contacts.json

echo Response:
type temp_contacts.json | powershell -Command "$input | ConvertFrom-Json | ConvertTo-Json -Depth 3"
echo.
echo.

REM Cleanup
del temp_*.json 2>nul

echo ==========================================
echo Test Complete
echo ==========================================
pause
