@echo off
setlocal enabledelayedexpansion

set API_URL=http://localhost:4000
set ADMIN_USERNAME=admin
set ADMIN_PASSWORD=Admin123^!@#

echo Testing admin login...
powershell -NoProfile -Command "$body = '{\"identifier\":\"admin\",\"password\":\"Admin123^^!@#\"}'; $body | Out-File -Encoding UTF8 -NoNewline temp_admlogin_req.json"

echo Request body:
type temp_admlogin_req.json
echo.

curl -v -X POST "%API_URL%/api/auth/login" ^
  -H "Content-Type: application/json" ^
  -d @temp_admlogin_req.json

del temp_admlogin_req.json 2>nul
