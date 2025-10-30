# Test all failing endpoints systematically

Write-Host "=== Testing All Failing Endpoints ===" -ForegroundColor Cyan
Write-Host ""

# Register and login
$timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$username = "testuser$timestamp"

Write-Host "1. Setup - Register & Login..." -ForegroundColor Yellow
$registerBody = @{ username = $username; email = "$username@test.com"; password = "Test123456#"; firstName = "Test"; lastName = "User" } | ConvertTo-Json
$regResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/register" -ContentType "application/json" -Body $registerBody
$loginBody = @{ identifier = $username; password = "Test123456#" } | ConvertTo-Json
$loginResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $loginBody
$token = $loginResponse.data.tokens.accessToken
$headers = @{ "Authorization" = "Bearer $token" }
Write-Host "   Setup: OK" -ForegroundColor Green
Write-Host ""

# Test contacts
Write-Host "2. GET /api/contacts..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/api/contacts" -Headers $headers
    Write-Host "   PASS - Contacts list" -ForegroundColor Green
} catch {
    Write-Host "   FAIL - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) { Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Gray }
}

# Test contact search
Write-Host "3. GET /api/contacts/search..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/api/contacts/search?q=test" -Headers $headers
    Write-Host "   PASS - Contact search" -ForegroundColor Green
} catch {
    Write-Host "   FAIL - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) { Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Gray }
}

# Test group creation
Write-Host "4. POST /api/groups..." -ForegroundColor Yellow
$groupBody = @{ name = "Test Group $timestamp"; description = "Test"; groupType = "private" } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/groups" -Headers $headers -ContentType "application/json" -Body $groupBody
    Write-Host "   PASS - Group created: $($response.data.id)" -ForegroundColor Green
    $groupId = $response.data.id
} catch {
    Write-Host "   FAIL - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) { Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Gray }
}

# Test files list
Write-Host "5. GET /api/files..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/api/files" -Headers $headers
    Write-Host "   PASS - Files list" -ForegroundColor Green
} catch {
    Write-Host "   FAIL - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) { Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Gray }
}

# Test notification settings GET
Write-Host "6. GET /api/notification-settings..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/api/notification-settings" -Headers $headers
    Write-Host "   PASS - Notification settings retrieved" -ForegroundColor Green
} catch {
    Write-Host "   FAIL - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) { Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Gray }
}

# Test notification settings UPDATE
Write-Host "7. PUT /api/notification-settings..." -ForegroundColor Yellow
$settingsBody = @{ emailEnabled = $false } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Method PUT -Uri "http://localhost:4000/api/notification-settings" -Headers $headers -ContentType "application/json" -Body $settingsBody
    Write-Host "   PASS - Settings updated" -ForegroundColor Green
} catch {
    Write-Host "   FAIL - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) { Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Gray }
}

# Test mark all notifications read
Write-Host "8. PUT /api/notifications/mark-all-read..." -ForegroundColor Yellow
$markBody = @{} | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Method PUT -Uri "http://localhost:4000/api/notifications/mark-all-read" -Headers $headers -ContentType "application/json" -Body $markBody
    Write-Host "   PASS - Marked all as read" -ForegroundColor Green
} catch {
    Write-Host "   FAIL - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) { Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Gray }
}

# Test admin login
Write-Host "9. Admin Login..." -ForegroundColor Yellow
$adminBody = @{ identifier = "admin"; password = "change_this_admin_password" } | ConvertTo-Json
try {
    $adminResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $adminBody
    $adminToken = $adminResponse.data.tokens.accessToken
    Write-Host "   PASS - Admin logged in" -ForegroundColor Green
    Write-Host "   Token: $($adminToken.Substring(0,40))..." -ForegroundColor Gray
} catch {
    Write-Host "   FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
