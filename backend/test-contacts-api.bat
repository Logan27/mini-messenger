@echo off
echo ==========================================
echo Contacts API Test Script
echo ==========================================
echo.

set BASE_URL=http://localhost:4000/api

REM Step 1: Login as testusera2 to get token
echo [Step 1] Logging in as testusera2...
curl -s -X POST "%BASE_URL%/auth/login" -H "Content-Type: application/json" -d "{\"identifier\":\"usera2@test.com\",\"password\":\"TestPass123@\"}" > temp_login.json

REM Extract token
for /f "tokens=*" %%i in ('powershell -Command "(Get-Content temp_login.json | ConvertFrom-Json).data.tokens.accessToken"') do set TOKEN=%%i

if "%TOKEN%"=="" (
    echo ERROR: Failed to get token
    type temp_login.json
    pause
    exit /b 1
)

echo SUCCESS: Token obtained
echo Token: %TOKEN:~0,50%...
echo.

REM Step 2: Get user B's ID
echo [Step 2] Getting testuserb2 ID...
curl -s -X GET "%BASE_URL%/users?limit=100" -H "Authorization: Bearer %TOKEN%" > temp_users.json

for /f "tokens=*" %%i in ('powershell -Command "$users = (Get-Content temp_users.json | ConvertFrom-Json).data.users; ($users | Where-Object {$_.username -eq 'testuserb2'}).id"') do set USER_B_ID=%%i

if "%USER_B_ID%"=="" (
    echo ERROR: Could not find testuserb2
    pause
    exit /b 1
)

echo SUCCESS: User B ID: %USER_B_ID%
echo.

REM Step 3: Add contact
echo [Step 3] Adding testuserb2 as contact...
curl -s -X POST "%BASE_URL%/contacts" -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN%" -d "{\"userId\":\"%USER_B_ID%\",\"nickname\":\"Test Contact\",\"notes\":\"Added via API test\"}" > temp_add_contact.json

echo Response:
type temp_add_contact.json
echo.
echo.

REM Extract contact ID
for /f "tokens=*" %%i in ('powershell -Command "(Get-Content temp_add_contact.json | ConvertFrom-Json).data.id"') do set CONTACT_ID=%%i

echo Contact ID: %CONTACT_ID%
echo.

REM Step 4: Get contacts list
echo [Step 4] Getting contacts list...
curl -s -X GET "%BASE_URL%/contacts?status=accepted" -H "Authorization: Bearer %TOKEN%" > temp_contacts.json

echo Response:
type temp_contacts.json | powershell -Command "$input | ConvertFrom-Json | ConvertTo-Json -Depth 5"
echo.
echo.

REM Step 5: Block contact
echo [Step 5] Blocking contact...
curl -s -X POST "%BASE_URL%/contacts/%CONTACT_ID%/block" -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN%" -d "{\"reason\":\"Testing block functionality\"}" > temp_block.json

echo Response:
type temp_block.json
echo.
echo.

REM Step 6: Get blocked contacts
echo [Step 6] Getting blocked contacts...
curl -s -X GET "%BASE_URL%/contacts?status=blocked" -H "Authorization: Bearer %TOKEN%" > temp_blocked.json

echo Response:
type temp_blocked.json | powershell -Command "$input | ConvertFrom-Json | ConvertTo-Json -Depth 5"
echo.
echo.

REM Step 7: Unblock contact
echo [Step 7] Unblocking contact...
curl -s -X DELETE "%BASE_URL%/contacts/%CONTACT_ID%/block" -H "Authorization: Bearer %TOKEN%" > temp_unblock.json

echo Response:
type temp_unblock.json
echo.
echo.

REM Step 8: Remove contact
echo [Step 8] Removing contact...
curl -s -X DELETE "%BASE_URL%/contacts/%CONTACT_ID%" -H "Authorization: Bearer %TOKEN%" > temp_remove.json

echo Response:
type temp_remove.json
echo.
echo.

REM Cleanup
del temp_*.json 2>nul

echo ==========================================
echo Test Complete
echo ==========================================
pause
