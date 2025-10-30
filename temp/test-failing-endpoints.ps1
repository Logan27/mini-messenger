# Test failing endpoints to get detailed errors

Write-Host "=== Testing Failing Endpoints with Detailed Errors ===" -ForegroundColor Cyan
Write-Host ""

# Register and login
$timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$username = "debuguser$timestamp"

Write-Host "Setup - Register & Login..." -ForegroundColor Yellow
$registerBody = @{ username = $username; email = "$username@test.com"; password = "Test123456#"; firstName = "Debug"; lastName = "User" } | ConvertTo-Json
$regResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/register" -ContentType "application/json" -Body $registerBody
$loginBody = @{ identifier = $username; password = "Test123456#" } | ConvertTo-Json
$loginResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $loginBody
$token = $loginResponse.data.tokens.accessToken
$userId = $loginResponse.data.user.id
$headers = @{ "Authorization" = "Bearer $token" }
Write-Host "   Setup OK - User ID: $userId" -ForegroundColor Green
Write-Host ""

# Test 1: Files endpoint
Write-Host "1. GET /api/files" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/api/files" -Headers $headers
    Write-Host "   PASS" -ForegroundColor Green
} catch {
    Write-Host "   FAIL - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) { 
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Gray 
        # Try to parse as JSON for better formatting
        try {
            $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "   Error: $($errorObj.error)" -ForegroundColor Gray
        } catch {}
    }
}
Write-Host ""

# Test 2: Notification settings GET
Write-Host "2. GET /api/notification-settings" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/api/notification-settings" -Headers $headers
    Write-Host "   PASS" -ForegroundColor Green
} catch {
    Write-Host "   FAIL - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) { 
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Gray 
    }
}
Write-Host ""

# Test 3: Notification settings PUT
Write-Host "3. PUT /api/notification-settings" -ForegroundColor Yellow
$settingsBody = @{ emailEnabled = $false } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Method PUT -Uri "http://localhost:4000/api/notification-settings" -Headers $headers -ContentType "application/json" -Body $settingsBody
    Write-Host "   PASS" -ForegroundColor Green
} catch {
    Write-Host "   FAIL - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) { 
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Gray 
    }
}
Write-Host ""

# Test 4: Notification settings RESET
Write-Host "4. POST /api/notification-settings/reset" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/notification-settings/reset" -Headers $headers
    Write-Host "   PASS" -ForegroundColor Green
} catch {
    Write-Host "   FAIL - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) { 
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Gray 
    }
}
Write-Host ""

# Test 5: Mark all notifications read
Write-Host "5. PUT /api/notifications/mark-all-read" -ForegroundColor Yellow
$markBody = @{} | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Method PUT -Uri "http://localhost:4000/api/notifications/mark-all-read" -Headers $headers -ContentType "application/json" -Body $markBody
    Write-Host "   PASS" -ForegroundColor Green
} catch {
    Write-Host "   FAIL - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) { 
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Gray 
    }
}
Write-Host ""

# Test 6: Create group
Write-Host "6. POST /api/groups" -ForegroundColor Yellow
$groupBody = @{ name = "Debug Group $timestamp"; description = "Test"; groupType = "private" } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/groups" -Headers $headers -ContentType "application/json" -Body $groupBody
    Write-Host "   PASS - Group ID: $($response.data.id)" -ForegroundColor Green
    $groupId = $response.data.id
} catch {
    Write-Host "   FAIL - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) { 
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Gray 
    }
}
Write-Host ""

# Test 7: Check backend logs for errors
Write-Host "7. Checking if backend is still running..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/health"
    Write-Host "   Backend healthy - Status: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "   Backend NOT responding!" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
