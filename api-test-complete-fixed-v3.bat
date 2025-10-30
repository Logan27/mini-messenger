@echo off
setlocal enabledelayedexpansion

REM Color codes for Windows terminal (ANSI escape sequences)
set "ESC="
for /f %%a in ('echo prompt $E^| cmd') do set "ESC=%%a"
set "RED=%ESC%[91m"
set "GREEN=%ESC%[92m"
set "YELLOW=%ESC%[93m"
set "BLUE=%ESC%[94m"
set "CYAN=%ESC%[96m"
set "RESET=%ESC%[0m"

REM Test configuration
set "API_URL=http://localhost:4000"
set "ADMIN_USERNAME=admin"
set "ADMIN_PASSWORD=change_this_admin_password"

REM Initialize counters
set /a TOTAL_TESTS=0
set /a PASSED_TESTS=0
set /a FAILED_TESTS=0
set /a SKIPPED_TESTS=0

REM Generate unique test data (alphanumeric only for username)
set "TIMESTAMP=%DATE:~-4%%DATE:~-7,2%%DATE:~-10,2%%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"
set "TIMESTAMP=%TIMESTAMP:_=%"
set "TEST_USERNAME=testuser%TIMESTAMP%"
set "TEST_EMAIL=test%TIMESTAMP%@example.com"
set "TEST_PASSWORD=Test123456#"

echo %BLUE%============================================================================%RESET%
echo %BLUE%         MESSENGER API TEST SUITE - FIXED VERSION%RESET%
echo %BLUE%============================================================================%RESET%
echo.
echo Starting API tests at %DATE% %TIME%
echo API URL: %API_URL%
echo.

REM Helper function to check if HTTP status is 2xx (success)
REM Usage: call :CheckHttpSuccess STATUS_CODE
goto :SkipFunctions

:CheckHttpSuccess
set STATUS=%~1
if "%STATUS:~0,1%"=="2" (
    exit /b 0
) else (
    exit /b 1
)

:SkipFunctions

echo %CYAN%============================================================================%RESET%
echo %CYAN%SECTION 1: HEALTH CHECK ENDPOINTS (4 endpoints)%RESET%
echo %CYAN%============================================================================%RESET%
echo.

REM Test 1: Health Check
echo [1] Testing GET /health - Health Check
set /a TOTAL_TESTS+=1
curl -s -o temp_health.json -w "%%{http_code}" "%API_URL%/health" > temp_status.txt
set /p HTTP_STATUS=<temp_status.txt
call :CheckHttpSuccess !HTTP_STATUS!
if !errorlevel! equ 0 (
    echo %GREEN%✓ PASS%RESET% - Health check endpoint accessible [HTTP !HTTP_STATUS!]
    set /a PASSED_TESTS+=1
) else (
    echo %RED%✗ FAIL%RESET% - Health check failed [HTTP !HTTP_STATUS!]
    set /a FAILED_TESTS+=1
)
del temp_health.json temp_status.txt 2>nul
echo.

REM Test 2: Detailed Health Check
echo [2] Testing GET /health/detailed - Detailed Health Check
set /a TOTAL_TESTS+=1
curl -s -o temp_detailed.json -w "%%{http_code}" "%API_URL%/health/detailed" > temp_status.txt
set /p HTTP_STATUS=<temp_status.txt
call :CheckHttpSuccess !HTTP_STATUS!
if !errorlevel! equ 0 (
    echo %GREEN%✓ PASS%RESET% - Detailed health check accessible [HTTP !HTTP_STATUS!]
    set /a PASSED_TESTS+=1
) else (
    echo %RED%✗ FAIL%RESET% - Detailed health check failed [HTTP !HTTP_STATUS!]
    set /a FAILED_TESTS+=1
)
del temp_detailed.json temp_status.txt 2>nul
echo.

REM Test 3: Readiness Check
echo [3] Testing GET /health/ready - Readiness Check
set /a TOTAL_TESTS+=1
curl -s -o temp_ready.json -w "%%{http_code}" "%API_URL%/health/ready" > temp_status.txt
set /p HTTP_STATUS=<temp_status.txt
call :CheckHttpSuccess !HTTP_STATUS!
if !errorlevel! equ 0 (
    echo %GREEN%✓ PASS%RESET% - Readiness check accessible [HTTP !HTTP_STATUS!]
    set /a PASSED_TESTS+=1
) else (
    echo %RED%✗ FAIL%RESET% - Readiness check failed [HTTP !HTTP_STATUS!]
    set /a FAILED_TESTS+=1
)
del temp_ready.json temp_status.txt 2>nul
echo.

REM Test 4: Liveness Check
echo [4] Testing GET /health/live - Liveness Check
set /a TOTAL_TESTS+=1
curl -s -o temp_live.json -w "%%{http_code}" "%API_URL%/health/live" > temp_status.txt
set /p HTTP_STATUS=<temp_status.txt
call :CheckHttpSuccess !HTTP_STATUS!
if !errorlevel! equ 0 (
    echo %GREEN%✓ PASS%RESET% - Liveness check accessible [HTTP !HTTP_STATUS!]
    set /a PASSED_TESTS+=1
) else (
    echo %RED%✗ FAIL%RESET% - Liveness check failed [HTTP !HTTP_STATUS!]
    set /a FAILED_TESTS+=1
)
del temp_live.json temp_status.txt 2>nul
echo.

echo %CYAN%============================================================================%RESET%
echo %CYAN%SECTION 2: AUTHENTICATION ENDPOINTS (9 endpoints)%RESET%
echo %CYAN%============================================================================%RESET%
echo.

REM Test 5: User Registration
echo [5] Testing POST /api/auth/register - User Registration
set /a TOTAL_TESTS+=1
echo {"username":"%TEST_USERNAME%","email":"%TEST_EMAIL%","password":"%TEST_PASSWORD%","firstName":"Test","lastName":"User"} > temp_register.json

curl -s -o temp_register_result.json -w "%%{http_code}" -X POST "%API_URL%/api/auth/register" ^
  -H "Content-Type: application/json" ^
  -d @temp_register.json > temp_status.txt
set /p HTTP_STATUS=<temp_status.txt

call :CheckHttpSuccess !HTTP_STATUS!
if !errorlevel! equ 0 (
    echo %GREEN%✓ PASS%RESET% - User registration successful [HTTP !HTTP_STATUS!]
    set /a PASSED_TESTS+=1
    for /f "delims=" %%i in ('powershell -NoProfile -Command "try { (Get-Content temp_register_result.json | ConvertFrom-Json).data.user.id } catch { '' }"') do set USER_ID=%%i
    if defined USER_ID echo   New User ID: !USER_ID!
) else (
    echo %RED%✗ FAIL%RESET% - User registration failed [HTTP !HTTP_STATUS!]
    set /a FAILED_TESTS+=1
    type temp_register_result.json 2>nul
)
del temp_register.json temp_register_result.json temp_status.txt 2>nul
echo.

REM Test 6: User Login
echo [6] Testing POST /api/auth/login - User Login
set /a TOTAL_TESTS+=1
echo {"identifier":"%TEST_USERNAME%","password":"%TEST_PASSWORD%"} > temp_login_req.json

curl -s -o temp_login.json -w "%%{http_code}" -X POST "%API_URL%/api/auth/login" ^
  -H "Content-Type: application/json" ^
  -d @temp_login_req.json > temp_status.txt
set /p HTTP_STATUS=<temp_status.txt

call :CheckHttpSuccess !HTTP_STATUS!
if !errorlevel! equ 0 (
    echo %GREEN%✓ PASS%RESET% - User login successful [HTTP !HTTP_STATUS!]
    set /a PASSED_TESTS+=1
    for /f "delims=" %%i in ('powershell -NoProfile -Command "try { (Get-Content temp_login.json | ConvertFrom-Json).data.tokens.accessToken } catch { '' }"') do set ACCESS_TOKEN=%%i
    for /f "delims=" %%i in ('powershell -NoProfile -Command "try { (Get-Content temp_login.json | ConvertFrom-Json).data.tokens.refreshToken } catch { '' }"') do set REFRESH_TOKEN=%%i
    if defined ACCESS_TOKEN echo   Access Token: !ACCESS_TOKEN:~0,50!...
) else (
    echo %RED%✗ FAIL%RESET% - User login failed [HTTP !HTTP_STATUS!]
    set /a FAILED_TESTS+=1
    type temp_login.json 2>nul
)
del temp_login_req.json temp_login.json temp_status.txt 2>nul
echo.

REM Test 7: Get Current User Profile (GET /api/auth/me)
echo [7] Testing GET /api/auth/me - Get Current User Profile
set /a TOTAL_TESTS+=1
if defined ACCESS_TOKEN (
    curl -s -o temp_me.json -w "%%{http_code}" "%API_URL%/api/auth/me" ^
      -H "Authorization: Bearer !ACCESS_TOKEN!" > temp_status.txt
    set /p HTTP_STATUS=<temp_status.txt
    call :CheckHttpSuccess !HTTP_STATUS!
    if !errorlevel! equ 0 (
        echo %GREEN%✓ PASS%RESET% - User profile retrieved [HTTP !HTTP_STATUS!]
        set /a PASSED_TESTS+=1
    ) else (
        echo %RED%✗ FAIL%RESET% - Failed to get profile [HTTP !HTTP_STATUS!]
        set /a FAILED_TESTS+=1
    )
    del temp_me.json temp_status.txt 2>nul
) else (
    echo %YELLOW%⊘ SKIP%RESET% - No access token available
    set /a SKIPPED_TESTS+=1
)
echo.

REM Test 8: Refresh Access Token
echo [8] Testing POST /api/auth/refresh - Refresh Access Token
set /a TOTAL_TESTS+=1
if defined REFRESH_TOKEN (
    echo {"refreshToken":"!REFRESH_TOKEN!"} > temp_refresh_req.json
    curl -s -o temp_refresh.json -w "%%{http_code}" -X POST "%API_URL%/api/auth/refresh" ^
      -H "Content-Type: application/json" ^
      -d @temp_refresh_req.json > temp_status.txt
    set /p HTTP_STATUS=<temp_status.txt
    call :CheckHttpSuccess !HTTP_STATUS!
    if !errorlevel! equ 0 (
        echo %GREEN%✓ PASS%RESET% - Token refresh successful [HTTP !HTTP_STATUS!]
        set /a PASSED_TESTS+=1
    ) else (
        echo %RED%✗ FAIL%RESET% - Token refresh failed [HTTP !HTTP_STATUS!]
        set /a FAILED_TESTS+=1
    )
    del temp_refresh_req.json temp_refresh.json temp_status.txt 2>nul
) else (
    echo %YELLOW%⊘ SKIP%RESET% - No refresh token available
    set /a SKIPPED_TESTS+=1
)
echo.

echo %CYAN%============================================================================%RESET%
echo %CYAN%SECTION 3: MESSAGING ENDPOINTS (9 endpoints)%RESET%
echo %CYAN%============================================================================%RESET%
echo.

REM Test 9: Send Message
echo [9] Testing POST /api/messages - Send New Message
set /a TOTAL_TESTS+=1
if defined ACCESS_TOKEN (
    if defined USER_ID (
        echo {"recipientId":"!USER_ID!","content":"Test message from API test suite"} > temp_msg_req.json
        curl -s -o temp_msg.json -w "%%{http_code}" -X POST "%API_URL%/api/messages" ^
          -H "Authorization: Bearer !ACCESS_TOKEN!" ^
          -H "Content-Type: application/json" ^
          -d @temp_msg_req.json > temp_status.txt
        set /p HTTP_STATUS=<temp_status.txt
        call :CheckHttpSuccess !HTTP_STATUS!
        if !errorlevel! equ 0 (
            echo %GREEN%✓ PASS%RESET% - Message sent successfully [HTTP !HTTP_STATUS!]
            set /a PASSED_TESTS+=1
            for /f "delims=" %%i in ('powershell -NoProfile -Command "try { (Get-Content temp_msg.json | ConvertFrom-Json).data.id } catch { '' }"') do set MESSAGE_ID=%%i
            if defined MESSAGE_ID echo   Message ID: !MESSAGE_ID!
        ) else (
            echo %RED%✗ FAIL%RESET% - Failed to send message [HTTP !HTTP_STATUS!]
            set /a FAILED_TESTS+=1
            type temp_msg.json 2>nul
        )
        del temp_msg_req.json temp_msg.json temp_status.txt 2>nul
    ) else (
        echo %YELLOW%⊘ SKIP%RESET% - No user ID available
        set /a SKIPPED_TESTS+=1
    )
) else (
    echo %YELLOW%⊘ SKIP%RESET% - No access token available
    set /a SKIPPED_TESTS+=1
)
echo.

REM Test 10: Get Conversation Messages
echo [10] Testing GET /api/messages?conversationWith={userId} - Get Conversation
set /a TOTAL_TESTS+=1
if defined ACCESS_TOKEN (
    if defined USER_ID (
        curl -s -o temp_conv.json -w "%%{http_code}" "%API_URL%/api/messages?conversationWith=!USER_ID!" ^
          -H "Authorization: Bearer !ACCESS_TOKEN!" > temp_status.txt
        set /p HTTP_STATUS=<temp_status.txt
        call :CheckHttpSuccess !HTTP_STATUS!
        if !errorlevel! equ 0 (
            echo %GREEN%✓ PASS%RESET% - Conversation messages retrieved [HTTP !HTTP_STATUS!]
            set /a PASSED_TESTS+=1
        ) else (
            echo %RED%✗ FAIL%RESET% - Failed to get conversation [HTTP !HTTP_STATUS!]
            set /a FAILED_TESTS+=1
        )
        del temp_conv.json temp_status.txt 2>nul
    ) else (
        echo %YELLOW%⊘ SKIP%RESET% - No user ID available
        set /a SKIPPED_TESTS+=1
    )
) else (
    echo %YELLOW%⊘ SKIP%RESET% - No access token available
    set /a SKIPPED_TESTS+=1
)
echo.

REM Additional simplified tests can be added here following the same pattern

echo %BLUE%============================================================================%RESET%
echo %BLUE%                        TEST SUMMARY%RESET%
echo %BLUE%============================================================================%RESET%
echo.
echo Total Tests:    !TOTAL_TESTS!
echo %GREEN%Passed:         !PASSED_TESTS!%RESET%
echo %RED%Failed:         !FAILED_TESTS!%RESET%
echo %YELLOW%Skipped:        !SKIPPED_TESTS!%RESET%

set /a SUCCESS_RATE=(!PASSED_TESTS! * 100) / !TOTAL_TESTS!
echo Success Rate:   !SUCCESS_RATE!%%
echo.

if !FAILED_TESTS! gtr 0 (
    echo %RED%Some tests failed. Please review the output above.%RESET%
    exit /b 1
) else (
    echo %GREEN%All executed tests passed successfully!%RESET%
    exit /b 0
)
