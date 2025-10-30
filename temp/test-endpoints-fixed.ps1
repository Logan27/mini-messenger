# Test failing endpoints with proper setup

Write-Host "=== Testing Endpoints ===" -ForegroundColor Cyan
Write-Host ""

# Register new user
Write-Host "1. Registering test user..." -ForegroundColor Yellow
$timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$username = "testuser$timestamp"
$registerBody = @{
    username = $username
    email = "$username@test.com"
    password = "Test123456#"
    firstName = "Test"
    lastName = "User"
} | ConvertTo-Json

try {
    $regResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/register" -ContentType "application/json" -Body $registerBody
    Write-Host "   Registration: OK" -ForegroundColor Green
    Write-Host "   Username: $username" -ForegroundColor Gray
} catch {
    Write-Host "   Registration: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Login
Write-Host "2. Logging in..." -ForegroundColor Yellow
$loginBody = @{
    identifier = $username
    password = "Test123456#"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.data.tokens.accessToken
    Write-Host "   Login: OK" -ForegroundColor Green
} catch {
    Write-Host "   Login: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

$headers = @{
    "Authorization" = "Bearer $token"
}

# Test user search
Write-Host "3. Testing user search..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/api/users/search?q=admin" -Headers $headers
    Write-Host "   User Search: OK" -ForegroundColor Green
    Write-Host "   Found: $($response.data.users.Count) users" -ForegroundColor Gray
} catch {
    Write-Host "   User Search: FAILED" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   Error: $($errorObj.error)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Test contacts list
Write-Host "4. Testing contacts list..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/api/contacts" -Headers $headers
    Write-Host "   Contacts List: OK" -ForegroundColor Green
    Write-Host "   Found: $($response.data.Count) contacts" -ForegroundColor Gray
} catch {
    Write-Host "   Contacts List: FAILED" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Error: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Test group creation
Write-Host "5. Testing group creation..." -ForegroundColor Yellow
$groupBody = @{
    name = "Test Group $timestamp"
    description = "Test group description"
    groupType = "private"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/groups" -Headers $headers -ContentType "application/json" -Body $groupBody
    Write-Host "   Group Creation: OK" -ForegroundColor Green
    Write-Host "   Group ID: $($response.data.id)" -ForegroundColor Gray
} catch {
    Write-Host "   Group Creation: FAILED" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Error: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Test notifications
Write-Host "6. Testing notifications..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/api/notifications" -Headers $headers
    Write-Host "   Notifications: OK" -ForegroundColor Green
    Write-Host "   Found: $($response.data.notifications.Count) notifications" -ForegroundColor Gray
} catch {
    Write-Host "   Notifications: FAILED" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Error: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Test files list
Write-Host "7. Testing files list..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/api/files" -Headers $headers
    Write-Host "   Files List: OK" -ForegroundColor Green
    Write-Host "   Found: $($response.data.Count) files" -ForegroundColor Gray
} catch {
    Write-Host "   Files List: FAILED" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Error: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}
Write-Host ""

Write-Host "=== Test Complete ===" -ForegroundColor Cyan
