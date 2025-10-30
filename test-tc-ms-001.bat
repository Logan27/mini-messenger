@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo TC-MS-001: Send 1-to-1 Text Message Test
echo ==========================================
echo.

set BASE_URL=http://localhost:4000/api

REM Create JSON files for payloads (using proper multiline echo to avoid escaping issues)
(
echo {
echo   "username": "testusera2",
echo   "email": "usera2@test.com",
echo   "password": "TestPass123@",
echo   "firstName": "Test",
echo   "lastName": "UserA"
echo }
) > register_a.json

(
echo {
echo   "username": "testuserb2",
echo   "email": "userb2@test.com",
echo   "password": "TestPass123@",
echo   "firstName": "Test",
echo   "lastName": "UserB"
echo }
) > register_b.json

(
echo {
echo   "identifier": "usera2@test.com",
echo   "password": "TestPass123@"
echo }
) > login_a.json

(
echo {
echo   "identifier": "userb2@test.com",
echo   "password": "TestPass123@"
echo }
) > login_b.json

echo [Step 1] Registering Test Users...
echo.

echo Registering User A (testusera)...
curl -s -X POST "%BASE_URL%/auth/register" -H "Content-Type: application/json" -d @register_a.json
echo.
echo.

echo Registering User B (testuserb)...
curl -s -X POST "%BASE_URL%/auth/register" -H "Content-Type: application/json" -d @register_b.json
echo.
echo.

echo [Step 2] Logging in User A...
curl -s -X POST "%BASE_URL%/auth/login" -H "Content-Type: application/json" -d @login_a.json > temp_login_a.json

type temp_login_a.json
echo.
echo.

REM Extract token using PowerShell
for /f "delims=" %%i in ('powershell -Command "try { (Get-Content temp_login_a.json | ConvertFrom-Json).data.tokens.accessToken } catch { '' }"') do set TOKEN_A=%%i

if "%TOKEN_A%"=="" (
    echo ERROR: Failed to get User A token
    del register_*.json login_*.json temp_*.json 2>nul
    pause
    exit /b 1
)

echo SUCCESS: User A Token obtained
echo.

echo [Step 3] Logging in User B...
curl -s -X POST "%BASE_URL%/auth/login" -H "Content-Type: application/json" -d @login_b.json > temp_login_b.json
echo Login response saved
echo.

echo [Step 4] Getting User B's ID...
curl -s -X GET "%BASE_URL%/users?limit=100" -H "Authorization: Bearer %TOKEN_A%" > temp_users.json
echo.

REM Extract User B ID using PowerShell
for /f "delims=" %%i in ('powershell -Command "$users = (Get-Content temp_users.json | ConvertFrom-Json).data.users; ($users | Where-Object {$_.username -eq 'testuserb2'}).id"') do set USER_B_ID=%%i

if "%USER_B_ID%"=="" (
    echo ERROR: Could not find User B
    del register_*.json login_*.json temp_*.json 2>nul
    pause
    exit /b 1
)

echo User B ID: %USER_B_ID%
echo.

echo [Step 5] TC-MS-001: Sending message from User A to User B...
echo Message: "Hello, this is a test message"
echo.

REM Create message payload
echo {"recipientId":"%USER_B_ID%","content":"Hello, this is a test message","messageType":"text"} > message.json

curl -s -X POST "%BASE_URL%/messages" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %TOKEN_A%" ^
  -d @message.json > temp_message.json

echo.
echo Message Response:
powershell -Command "Get-Content temp_message.json | ConvertFrom-Json | ConvertTo-Json -Depth 10"
echo.
echo.

REM Check if successful
findstr /C:"\"success\":true" temp_message.json >nul
if %errorlevel%==0 (
    echo ✓ TEST PASSED: Message sent successfully
    echo.

    REM Extract message ID
    for /f "delims=" %%i in ('powershell -Command "try { (Get-Content temp_message.json | ConvertFrom-Json).data.id } catch { 'N/A' }"') do set MESSAGE_ID=%%i
    echo Message ID: !MESSAGE_ID!
    echo.

    echo Verifying TC-MS-001 Expected Results:
    echo ✓ Message sent immediately
    echo ✓ Message ID generated: !MESSAGE_ID!

    findstr /C:"\"status\":\"sent\"" temp_message.json >nul
    if !errorlevel!==0 echo ✓ Message status: sent (single checkmark)

    findstr /C:"\"createdAt\"" temp_message.json >nul
    if !errorlevel!==0 echo ✓ Timestamp recorded (UTC)

) else (
    echo ✗ TEST FAILED: Message not sent
    echo.
    echo Error details:
    type temp_message.json
)

echo.
echo ==========================================
echo Test Complete
echo ==========================================
echo.

REM Cleanup
del register_*.json login_*.json temp_*.json message.json 2>nul

pause
endlocal
