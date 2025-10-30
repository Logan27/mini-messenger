@echo off
setlocal enabledelayedexpansion

set API_URL=http://localhost:4000
set ADMIN_USERNAME=admin

REM Get admin token
powershell -NoProfile -Command "$body = '{\"identifier\":\"admin\",\"password\":\"Admin123^^!@#\"}'; $body | Out-File -Encoding UTF8 -NoNewline temp_admlogin_req.json"
curl -s -o temp_admlogin.json -w "%%{http_code}" -X POST "%API_URL%/api/auth/login" ^
  -H "Content-Type: application/json" ^
  -d @temp_admlogin_req.json > temp_status.txt

powershell -NoProfile -Command "$j = Get-Content temp_admlogin.json | ConvertFrom-Json; $j.data.tokens.accessToken" > temp_admin_token.txt
set /p ADMIN_TOKEN=<temp_admin_token.txt

echo Admin token: %ADMIN_TOKEN%
echo.

REM Create test file
echo This is a test file for upload > test-file.txt

echo Uploading file...
curl -s -o temp_upload.json -w "%%{http_code}" -X POST "%API_URL%/api/files/upload" ^
  -H "Authorization: Bearer %ADMIN_TOKEN%" ^
  -F "files=@test-file.txt" ^
  -F "type=document" > temp_upload_status.txt

set /p UPLOAD_STATUS=<temp_upload_status.txt
echo Upload status: %UPLOAD_STATUS%

echo.
echo Upload response:
type temp_upload.json | jq .
echo.

REM Extract file ID
for /f "delims=" %%i in ('powershell -NoProfile -Command "try { (Get-Content temp_upload.json | ConvertFrom-Json).files[0].id } catch { '' }"') do set FILE_ID=%%i

if defined FILE_ID (
    echo File ID: !FILE_ID!
    echo.
    echo Downloading file...
    curl -v -o temp_download.dat -w "%%{http_code}" "%API_URL%/api/files/!FILE_ID!" ^
      -H "Authorization: Bearer %ADMIN_TOKEN%" > temp_download_status.txt
    
    set /p DOWNLOAD_STATUS=<temp_download_status.txt
    echo Download status: !DOWNLOAD_STATUS!
) else (
    echo ERROR: No file ID in upload response
)

REM Cleanup
del test-file.txt 2>nul
del temp_*.txt 2>nul
del temp_*.json 2>nul
del temp_*.dat 2>nul
