# Test all notification endpoints
$timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$username = "notiftest$timestamp"

$registerBody = @{ username = $username; email = "$username@test.com"; password = "Test123456#"; firstName = "Notif"; lastName = "Test" } | ConvertTo-Json
$regResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/register" -ContentType "application/json" -Body $registerBody
$loginBody = @{ identifier = $username; password = "Test123456#" } | ConvertTo-Json
$loginResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $loginBody
$token = $loginResponse.data.tokens.accessToken
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "User: $username" -ForegroundColor Green

# Test 1: Mark all read
Write-Host "1. PUT /api/notifications/mark-all-read" -ForegroundColor Yellow
$markBody = @{} | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Method PUT -Uri "http://localhost:4000/api/notifications/mark-all-read" -Headers $headers -ContentType "application/json" -Body $markBody
    Write-Host "   PASS" -ForegroundColor Green
} catch {
    Write-Host "   FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Get notification settings
Write-Host "2. GET /api/notification-settings" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/api/notification-settings" -Headers $headers
    Write-Host "   PASS" -ForegroundColor Green
} catch {
    Write-Host "   FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Update notification settings
Write-Host "3. PUT /api/notification-settings" -ForegroundColor Yellow
$settingsBody = @{ emailEnabled = $false; pushEnabled = $true } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Method PUT -Uri "http://localhost:4000/api/notification-settings" -Headers $headers -ContentType "application/json" -Body $settingsBody
    Write-Host "   PASS" -ForegroundColor Green
} catch {
    Write-Host "   FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Reset notification settings
Write-Host "4. POST /api/notification-settings/reset" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/notification-settings/reset" -Headers $headers
    Write-Host "   PASS" -ForegroundColor Green
} catch {
    Write-Host "   FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Done!" -ForegroundColor Cyan
