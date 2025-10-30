@echo off
echo === Testing Avatar Upload ===
echo.

echo 1. Logging in...
curl -s -X POST http://localhost:4000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"identifier\":\"admin\",\"password\":\"change_this_admin_password\"}" > temp_avatar_login.json

for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content temp_avatar_login.json | ConvertFrom-Json).data.tokens.accessToken"') do set TOKEN=%%i

if defined TOKEN (
    echo    Login: OK
    echo    Token: %TOKEN:~0,30%...
) else (
    echo    Login: FAILED
    type temp_avatar_login.json
    exit /b 1
)

echo.
echo 2. Uploading avatar...
curl -s -X POST http://localhost:4000/api/users/me/avatar ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "avatar=@test-files/test-image.png" > temp_avatar_upload.json

type temp_avatar_upload.json
echo.

powershell -NoProfile -Command "$r = Get-Content temp_avatar_upload.json | ConvertFrom-Json; if ($r.success) { Write-Host '   Avatar Upload: OK' -ForegroundColor Green } else { Write-Host '   Avatar Upload: FAILED' -ForegroundColor Red; Write-Host \"   Error: $($r.error.message)\" -ForegroundColor Yellow }"

del temp_avatar_login.json temp_avatar_upload.json 2>nul
echo.
echo === Test Complete ===
