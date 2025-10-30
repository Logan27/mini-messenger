@echo off
setlocal enabledelayedexpansion

REM HTTP Status Check Function
goto :SkipHttpCheckFunction
:CheckHttpSuccess
set STATUS=%~1
if "%STATUS:~0,1%"=="2" (
    exit /b 0
) else (
    exit /b 1
)
:SkipHttpCheckFunction

REM Color codes
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "CYAN=[96m"
set "RESET=[0m"

set "API_URL=http://localhost:4000"
set /a TOTAL_TESTS=0
set /a PASSED_TESTS=0
set /a FAILED_TESTS=0

REM Generate unique test data
for /f %%i in ('powershell -NoProfile -Command "[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()"') do set TIMESTAMP=%%i
set "TEST_USERNAME=testuser!TIMESTAMP!"
set "TEST_EMAIL=test!TIMESTAMP!@example.com"
set "TEST_PASSWORD=Test123456#"

echo %CYAN%=== CORE API TESTS ===%RESET%
echo API URL: %API_URL%
echo.

REM Test 1: Health Check
echo [1] Health Check
set /a TOTAL_TESTS+=1
curl -s -o nul -w "%%{http_code}" "%API_URL%/health" > temp_status.txt
set /p HTTP_STATUS=<temp_status.txt
call :CheckHttpSuccess !HTTP_STATUS!
if !errorlevel! equ 0 (
    echo %GREEN%PASS%RESET% [!HTTP_STATUS!]
    set /a PASSED_TESTS+=1
) else (
    echo %RED%FAIL%RESET% [!HTTP_STATUS!]
    set /a FAILED_TESTS+=1
)
echo.

REM Test 2: Register
echo [2] Register User
set /a TOTAL_TESTS+=1
echo {"username":"!TEST_USERNAME!","email":"!TEST_EMAIL!","password":"!TEST_PASSWORD!","firstName":"Test","lastName":"User"} > temp_reg.json
curl -s -o temp_reg_resp.json -w "%%{http_code}" -X POST "%API_URL%/api/auth/register" -H "Content-Type: application/json" -d @temp_reg.json > temp_status.txt
set /p HTTP_STATUS=<temp_status.txt
call :CheckHttpSuccess !HTTP_STATUS!
if !errorlevel! equ 0 (
    for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content temp_reg_resp.json | ConvertFrom-Json).data.user.id"') do set USER_ID=%%i
    echo %GREEN%PASS%RESET% [!HTTP_STATUS!] User ID: !USER_ID!
    set /a PASSED_TESTS+=1
) else (
    echo %RED%FAIL%RESET% [!HTTP_STATUS!]
    type temp_reg_resp.json
    set /a FAILED_TESTS+=1
)
del temp_reg.json temp_reg_resp.json temp_status.txt 2>nul
echo.

REM Test 3: Login
echo [3] Login
set /a TOTAL_TESTS+=1
echo {"identifier":"!TEST_USERNAME!","password":"!TEST_PASSWORD!"} > temp_login.json
curl -s -o temp_login_resp.json -w "%%{http_code}" -X POST "%API_URL%/api/auth/login" -H "Content-Type: application/json" -d @temp_login.json > temp_status.txt
set /p HTTP_STATUS=<temp_status.txt
call :CheckHttpSuccess !HTTP_STATUS!
if !errorlevel! equ 0 (
    for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content temp_login_resp.json | ConvertFrom-Json).data.tokens.accessToken"') do set ACCESS_TOKEN=%%i
    echo %GREEN%PASS%RESET% [!HTTP_STATUS!] Token: !ACCESS_TOKEN:~0,30!...
    set /a PASSED_TESTS+=1
) else (
    echo %RED%FAIL%RESET% [!HTTP_STATUS!]
    type temp_login_resp.json
    set /a FAILED_TESTS+=1
)
del temp_login.json temp_login_resp.json temp_status.txt 2>nul
echo.

REM Test 4: Get Profile (/api/auth/me)
echo [4] Get Profile (auth/me)
set /a TOTAL_TESTS+=1
if defined ACCESS_TOKEN (
    curl -s -o temp_profile.json -w "%%{http_code}" "%API_URL%/api/auth/me" -H "Authorization: Bearer !ACCESS_TOKEN!" > temp_status.txt
    set /p HTTP_STATUS=<temp_status.txt
    call :CheckHttpSuccess !HTTP_STATUS!
    if !errorlevel! equ 0 (
        echo %GREEN%PASS%RESET% [!HTTP_STATUS!]
        set /a PASSED_TESTS+=1
    ) else (
        echo %RED%FAIL%RESET% [!HTTP_STATUS!]
        type temp_profile.json
        set /a FAILED_TESTS+=1
    )
    del temp_profile.json temp_status.txt 2>nul
) else (
    echo %YELLOW%SKIP%RESET% - No token
)
echo.

REM Test 5: Get User Profile (/api/users/me)
echo [5] Get User Profile (users/me)
set /a TOTAL_TESTS+=1
if defined ACCESS_TOKEN (
    curl -s -o temp_userme.json -w "%%{http_code}" "%API_URL%/api/users/me" -H "Authorization: Bearer !ACCESS_TOKEN!" > temp_status.txt
    set /p HTTP_STATUS=<temp_status.txt
    call :CheckHttpSuccess !HTTP_STATUS!
    if !errorlevel! equ 0 (
        echo %GREEN%PASS%RESET% [!HTTP_STATUS!]
        set /a PASSED_TESTS+=1
    ) else (
        echo %RED%FAIL%RESET% [!HTTP_STATUS!]
        type temp_userme.json
        set /a FAILED_TESTS+=1
    )
    del temp_userme.json temp_status.txt 2>nul
) else (
    echo %YELLOW%SKIP%RESET% - No token
)
echo.

REM Test 6: Send Message
echo [6] Send Message
set /a TOTAL_TESTS+=1
if defined ACCESS_TOKEN (
    if defined USER_ID (
        echo {"recipientId":"!USER_ID!","content":"Test message"} > temp_msg.json
        curl -s -o temp_msg_resp.json -w "%%{http_code}" -X POST "%API_URL%/api/messages" -H "Authorization: Bearer !ACCESS_TOKEN!" -H "Content-Type: application/json" -d @temp_msg.json > temp_status.txt
        set /p HTTP_STATUS=<temp_status.txt
        call :CheckHttpSuccess !HTTP_STATUS!
        if !errorlevel! equ 0 (
            for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content temp_msg_resp.json | ConvertFrom-Json).data.id"') do set MESSAGE_ID=%%i
            echo %GREEN%PASS%RESET% [!HTTP_STATUS!] Message ID: !MESSAGE_ID!
            set /a PASSED_TESTS+=1
        ) else (
            echo %RED%FAIL%RESET% [!HTTP_STATUS!]
            type temp_msg_resp.json
            set /a FAILED_TESTS+=1
        )
        del temp_msg.json temp_msg_resp.json temp_status.txt 2>nul
    ) else (
        echo %YELLOW%SKIP%RESET% - No user ID
    )
) else (
    echo %YELLOW%SKIP%RESET% - No token
)
echo.

REM Test 7: Get Messages
echo [7] Get Messages
set /a TOTAL_TESTS+=1
if defined ACCESS_TOKEN (
    if defined USER_ID (
        curl -s -o temp_msgs.json -w "%%{http_code}" "%API_URL%/api/messages?conversationWith=!USER_ID!" -H "Authorization: Bearer !ACCESS_TOKEN!" > temp_status.txt
        set /p HTTP_STATUS=<temp_status.txt
        call :CheckHttpSuccess !HTTP_STATUS!
        if !errorlevel! equ 0 (
            echo %GREEN%PASS%RESET% [!HTTP_STATUS!]
            set /a PASSED_TESTS+=1
        ) else (
            echo %RED%FAIL%RESET% [!HTTP_STATUS!]
            type temp_msgs.json
            set /a FAILED_TESTS+=1
        )
        del temp_msgs.json temp_status.txt 2>nul
    ) else (
        echo %YELLOW%SKIP%RESET% - No user ID
    )
) else (
    echo %YELLOW%SKIP%RESET% - No token
)
echo.

echo %CYAN%=== SUMMARY ===%RESET%
echo Total:  !TOTAL_TESTS!
echo %GREEN%Passed: !PASSED_TESTS!%RESET%
echo %RED%Failed: !FAILED_TESTS!%RESET%
set /a SUCCESS_RATE=(!PASSED_TESTS! * 100) / !TOTAL_TESTS!
echo Success Rate: !SUCCESS_RATE!%%
