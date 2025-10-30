# Test endpoints and capture full error stack

Write-Host "=== Verbose Error Testing ===" -ForegroundColor Cyan
$ErrorActionPreference = "Continue"

# Setup
$timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$username = "verbose$timestamp"

$registerBody = @{ username = $username; email = "$username@test.com"; password = "Test123456#"; firstName = "Test"; lastName = "User" } | ConvertTo-Json
$regResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/register" -ContentType "application/json" -Body $registerBody
$loginBody = @{ identifier = $username; password = "Test123456#" } | ConvertTo-Json
$loginResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $loginBody
$token = $loginResponse.data.tokens.accessToken
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "Logged in as: $username" -ForegroundColor Green
Write-Host ""

# Test notification settings - check if model exists
Write-Host "Test: GET /api/notification-settings" -ForegroundColor Yellow
try {
    $url = "http://localhost:4000/api/notification-settings"
    Write-Host "  URL: $url" -ForegroundColor Gray
    Write-Host "  Headers: Authorization=Bearer <token>" -ForegroundColor Gray
    
    $response = Invoke-WebRequest -Method GET -Uri $url -Headers $headers -UseBasicParsing
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "  Body: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "  Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "  Error Body: $responseBody" -ForegroundColor Red
    
    # Also check if there's more detail
    if ($_.ErrorDetails) {
        Write-Host "  Error Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test files endpoint
Write-Host "Test: GET /api/files" -ForegroundColor Yellow
try {
    $url = "http://localhost:4000/api/files"
    Write-Host "  URL: $url" -ForegroundColor Gray
    
    $response = Invoke-WebRequest -Method GET -Uri $url -Headers $headers -UseBasicParsing
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "  Body: $($response.Content.Substring(0, [Math]::Min(200, $response.Content.Length)))..." -ForegroundColor Green
} catch {
    Write-Host "  Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "  Error Body: $responseBody" -ForegroundColor Red
}
Write-Host ""

# Test groups endpoint
Write-Host "Test: POST /api/groups" -ForegroundColor Yellow
try {
    $url = "http://localhost:4000/api/groups"
    $groupBody = @{ name = "Test Group"; description = "Test"; groupType = "private" } | ConvertTo-Json
    Write-Host "  URL: $url" -ForegroundColor Gray
    Write-Host "  Body: $groupBody" -ForegroundColor Gray
    
    $response = Invoke-WebRequest -Method POST -Uri $url -Headers $headers -Body $groupBody -ContentType "application/json" -UseBasicParsing
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Green
    $respObj = $response.Content | ConvertFrom-Json
    Write-Host "  Group ID: $($respObj.data.id)" -ForegroundColor Green
} catch {
    Write-Host "  Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "  Error Body: $responseBody" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
