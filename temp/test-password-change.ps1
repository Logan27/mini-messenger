# Test password change to see exact error
$registerBody = @{
    username = "pwdtestuser"
    email = "pwdtest@test.com"
    password = "Test123456#"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/register" -ContentType "application/json" -Body $registerBody | Out-Null
    Write-Host "User registered" -ForegroundColor Green
} catch {
    Write-Host "User already exists or registration failed" -ForegroundColor Yellow
}

$loginBody = @{
    identifier = "pwdtestuser"
    password = "Test123456#"
} | ConvertTo-Json

$login = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $loginBody
$token = $login.data.tokens.accessToken
Write-Host "Logged in successfully" -ForegroundColor Green
Write-Host ""

$headers = @{ "Authorization" = "Bearer $token" }
$changeBody = @{
    currentPassword = "Test123456#"
    newPassword = "NewTest123456#"
    confirmPassword = "NewTest123456#"
} | ConvertTo-Json

Write-Host "Attempting password change..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/change-password" -Headers $headers -ContentType "application/json" -Body $changeBody
    Write-Host "SUCCESS!" -ForegroundColor Green
} catch {
    Write-Host "FAILED!" -ForegroundColor Red
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Status: $statusCode"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host "Error: $errorBody" -ForegroundColor Gray
}
