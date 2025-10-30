@echo off
REM Calls API Test Suite
REM Tests all calls endpoints with various scenarios

setlocal enabledelayedexpansion

echo ===================================
echo CALLS API TEST SUITE
echo ===================================
echo.

REM Login as testuser1 to get token
echo [TEST 1] Login as testuser1...
curl -s -X POST "http://localhost:4000/api/auth/login" ^
  -H "Content-Type: application/json" ^
  -d "{\"identifier\":\"testuser1\",\"password\":\"Test123456#\"}" > temp_call_login1.json

for /f "delims=" %%i in ('powershell -Command "(Get-Content temp_call_login1.json | ConvertFrom-Json).data.tokens.accessToken"') do set TOKEN1=%%i
for /f "delims=" %%i in ('powershell -Command "(Get-Content temp_call_login1.json | ConvertFrom-Json).data.user.id"') do set USER1_ID=%%i

if "%TOKEN1%"=="" (
  echo FAILED: Could not get testuser1 token
  exit /b 1
)
echo SUCCESS: Got testuser1 token and ID
echo.

REM Login as testuser2 to get recipient ID
echo [TEST 2] Login as testuser2...
curl -s -X POST "http://localhost:4000/api/auth/login" ^
  -H "Content-Type: application/json" ^
  -d "{\"identifier\":\"testuser2\",\"password\":\"Test123456#\"}" > temp_call_login2.json

for /f "delims=" %%i in ('powershell -Command "(Get-Content temp_call_login2.json | ConvertFrom-Json).data.user.id"') do set USER2_ID=%%i

if "%USER2_ID%"=="" (
  echo FAILED: Could not get testuser2 ID
  exit /b 1
)
echo SUCCESS: Got testuser2 ID: %USER2_ID%
echo.

REM Test 1: Initiate video call
echo [TEST 3] Initiate video call to testuser2...
curl -s -X POST "http://localhost:4000/api/calls" ^
  -H "Authorization: Bearer %TOKEN1%" ^
  -H "Content-Type: application/json" ^
  -d "{\"recipientId\":\"%USER2_ID%\",\"callType\":\"video\"}" > temp_call_initiate.json

powershell -Command "(Get-Content temp_call_initiate.json | ConvertFrom-Json) | ConvertTo-Json -Depth 10"
findstr /C:"success" temp_call_initiate.json > nul
if errorlevel 1 (
  echo FAILED: Could not initiate call
) else (
  echo SUCCESS: Call initiated
)
echo.

for /f "delims=" %%i in ('powershell -Command "(Get-Content temp_call_initiate.json | ConvertFrom-Json).data.id"') do set CALL_ID=%%i
echo Call ID: %CALL_ID%
echo.

REM Test 2: Get call details
if not "%CALL_ID%"=="" (
  echo [TEST 4] Get call details...
  curl -s -X GET "http://localhost:4000/api/calls/%CALL_ID%" ^
    -H "Authorization: Bearer %TOKEN1%" > temp_call_details.json

  powershell -Command "(Get-Content temp_call_details.json | ConvertFrom-Json) | ConvertTo-Json -Depth 10"
  findstr /C:"success" temp_call_details.json > nul
  if errorlevel 1 (
    echo FAILED: Could not get call details
  ) else (
    echo SUCCESS: Got call details
  )
  echo.
)

REM Test 3: Respond to call (reject)
if not "%CALL_ID%"=="" (
  echo [TEST 5] Reject call...
  curl -s -X POST "http://localhost:4000/api/calls/respond" ^
    -H "Authorization: Bearer %TOKEN1%" ^
    -H "Content-Type: application/json" ^
    -d "{\"callId\":\"%CALL_ID%\",\"response\":\"reject\"}" > temp_call_reject.json

  powershell -Command "(Get-Content temp_call_reject.json | ConvertFrom-Json) | ConvertTo-Json -Depth 10"
  findstr /C:"success" temp_call_reject.json > nul
  if errorlevel 1 (
    echo FAILED: Could not reject call
  ) else (
    echo SUCCESS: Call rejected
  )
  echo.
)

REM Test 4: Initiate audio call and accept
echo [TEST 6] Initiate audio call to testuser2...
curl -s -X POST "http://localhost:4000/api/calls" ^
  -H "Authorization: Bearer %TOKEN1%" ^
  -H "Content-Type: application/json" ^
  -d "{\"recipientId\":\"%USER2_ID%\",\"callType\":\"audio\"}" > temp_call_audio.json

powershell -Command "(Get-Content temp_call_audio.json | ConvertFrom-Json) | ConvertTo-Json -Depth 10"
findstr /C:"success" temp_call_audio.json > nul
if errorlevel 1 (
  echo FAILED: Could not initiate audio call
) else (
  echo SUCCESS: Audio call initiated
)
echo.

for /f "delims=" %%i in ('powershell -Command "(Get-Content temp_call_audio.json | ConvertFrom-Json).data.id"') do set CALL2_ID=%%i

REM Test 5: Accept call
if not "%CALL2_ID%"=="" (
  echo [TEST 7] Accept call...
  curl -s -X POST "http://localhost:4000/api/calls/respond" ^
    -H "Authorization: Bearer %TOKEN1%" ^
    -H "Content-Type: application/json" ^
    -d "{\"callId\":\"%CALL2_ID%\",\"response\":\"accept\"}" > temp_call_accept.json

  powershell -Command "(Get-Content temp_call_accept.json | ConvertFrom-Json) | ConvertTo-Json -Depth 10"
  findstr /C:"success" temp_call_accept.json > nul
  if errorlevel 1 (
    echo FAILED: Could not accept call
  ) else (
    echo SUCCESS: Call accepted
  )
  echo.
)

REM Test 6: End call
if not "%CALL2_ID%"=="" (
  echo [TEST 8] End call...
  curl -s -X POST "http://localhost:4000/api/calls/%CALL2_ID%/end" ^
    -H "Authorization: Bearer %TOKEN1%" > temp_call_end.json

  powershell -Command "(Get-Content temp_call_end.json | ConvertFrom-Json) | ConvertTo-Json -Depth 10"
  findstr /C:"success" temp_call_end.json > nul
  if errorlevel 1 (
    echo FAILED: Could not end call
  ) else (
    echo SUCCESS: Call ended
  )
  echo.
)

REM Test 7: Invalid call type
echo [TEST 9] Test invalid call type...
curl -s -X POST "http://localhost:4000/api/calls" ^
  -H "Authorization: Bearer %TOKEN1%" ^
  -H "Content-Type: application/json" ^
  -d "{\"recipientId\":\"%USER2_ID%\",\"callType\":\"invalid\"}" > temp_call_invalid.json

powershell -Command "(Get-Content temp_call_invalid.json | ConvertFrom-Json) | ConvertTo-Json -Depth 10"
findstr /C:"success.:false" temp_call_invalid.json > nul
if errorlevel 1 (
  echo FAILED: Should reject invalid call type
) else (
  echo SUCCESS: Invalid call type rejected
)
echo.

REM Test 8: Missing recipient
echo [TEST 10] Test missing recipient...
curl -s -X POST "http://localhost:4000/api/calls" ^
  -H "Authorization: Bearer %TOKEN1%" ^
  -H "Content-Type: application/json" ^
  -d "{\"callType\":\"video\"}" > temp_call_norecipient.json

powershell -Command "(Get-Content temp_call_norecipient.json | ConvertFrom-Json) | ConvertTo-Json -Depth 10"
findstr /C:"success.:false" temp_call_norecipient.json > nul
if errorlevel 1 (
  echo FAILED: Should reject missing recipient
) else (
  echo SUCCESS: Missing recipient rejected
)
echo.

REM Test 9: Invalid recipient ID
echo [TEST 11] Test invalid recipient ID...
curl -s -X POST "http://localhost:4000/api/calls" ^
  -H "Authorization: Bearer %TOKEN1%" ^
  -H "Content-Type: application/json" ^
  -d "{\"recipientId\":\"invalid-uuid\",\"callType\":\"video\"}" > temp_call_invalidrecipient.json

powershell -Command "(Get-Content temp_call_invalidrecipient.json | ConvertFrom-Json) | ConvertTo-Json -Depth 10"
findstr /C:"success.:false" temp_call_invalidrecipient.json > nul
if errorlevel 1 (
  echo FAILED: Should reject invalid recipient ID
) else (
  echo SUCCESS: Invalid recipient ID rejected
)
echo.

REM Test 10: Call to non-existent user
echo [TEST 12] Test call to non-existent user...
curl -s -X POST "http://localhost:4000/api/calls" ^
  -H "Authorization: Bearer %TOKEN1%" ^
  -H "Content-Type: application/json" ^
  -d "{\"recipientId\":\"00000000-0000-0000-0000-000000000000\",\"callType\":\"video\"}" > temp_call_notfound.json

powershell -Command "(Get-Content temp_call_notfound.json | ConvertFrom-Json) | ConvertTo-Json -Depth 10"
findstr /C:"success.:false" temp_call_notfound.json > nul
if errorlevel 1 (
  echo FAILED: Should reject call to non-existent user
) else (
  echo SUCCESS: Call to non-existent user rejected
)
echo.

REM Cleanup
echo Cleaning up temporary files...
del temp_call_*.json 2>nul

echo.
echo ===================================
echo CALLS API TESTS COMPLETE
echo ===================================
