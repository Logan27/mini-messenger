# Debug all HTTP 500 errors with detailed error capture
$ErrorActionPreference = "Continue"

# Login as admin
$loginBody = @{
    identifier = "admin"
    password = "change_this_admin_password"
} | ConvertTo-Json

$login = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $loginBody
$adminToken = $login.data.tokens.accessToken
$adminHeaders = @{ "Authorization" = "Bearer $adminToken" }

Write-Host "=== Testing HTTP 500 Errors ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Admin Stats
Write-Host "1. GET /api/admin/stats" -ForegroundColor Yellow
try {
    $stats = Invoke-WebRequest -Method GET -Uri "http://localhost:4000/api/admin/stats" -Headers $adminHeaders
    Write-Host "   SUCCESS - Status: $($stats.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   FAILED - Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    $result = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($result)
    $responseBody = $reader.ReadToEnd()
    Write-Host "   Response: $responseBody" -ForegroundColor Gray
}
Write-Host ""

# Test 2: Announcements
Write-Host "2. GET /api/announcements" -ForegroundColor Yellow
try {
    $announcements = Invoke-WebRequest -Method GET -Uri "http://localhost:4000/api/announcements" -Headers $adminHeaders
    Write-Host "   SUCCESS - Status: $($announcements.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   FAILED - Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    $result = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($result)
    $responseBody = $reader.ReadToEnd()
    Write-Host "   Response: $responseBody" -ForegroundColor Gray
}
Write-Host ""

# Test 3: File Upload
Write-Host "3. POST /api/files/upload" -ForegroundColor Yellow
try {
    $filePath = "C:\Users\anton\Documents\messenger\test-files\test-image.png"
    if (Test-Path $filePath) {
        $form = @{
            files = Get-Item $filePath
        }
        $upload = Invoke-WebRequest -Method POST -Uri "http://localhost:4000/api/files/upload" -Headers $adminHeaders -Form $form
        Write-Host "   SUCCESS - Status: $($upload.StatusCode)" -ForegroundColor Green
    } else {
        Write-Host "   SKIPPED - Test file not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   FAILED - Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    $result = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($result)
    $responseBody = $reader.ReadToEnd()
    Write-Host "   Response: $responseBody" -ForegroundColor Gray
}
Write-Host ""

# Test 4: Password Change (create new user first)
Write-Host "4. POST /api/auth/change-password" -ForegroundColor Yellow
$registerBody = @{
    username = "debuguser" + (Get-Random -Maximum 9999)
    email = "debuguser$(Get-Random -Maximum 9999)@test.com"
    password = "Test123456#"
} | ConvertTo-Json

try {
    $register = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/register" -ContentType "application/json" -Body $registerBody
    $userLogin = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body (@{
        identifier = $register.data.user.username
        password = "Test123456#"
    } | ConvertTo-Json)
    
    $userToken = $userLogin.data.tokens.accessToken
    $userHeaders = @{ "Authorization" = "Bearer $userToken" }
    
    $changeBody = @{
        currentPassword = "Test123456#"
        newPassword = "NewTest123456#"
        confirmPassword = "NewTest123456#"
    } | ConvertTo-Json
    
    $change = Invoke-WebRequest -Method POST -Uri "http://localhost:4000/api/auth/change-password" -Headers $userHeaders -ContentType "application/json" -Body $changeBody
    Write-Host "   SUCCESS - Status: $($change.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   FAILED - Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    $result = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($result)
    $responseBody = $reader.ReadToEnd()
    Write-Host "   Response: $responseBody" -ForegroundColor Gray
}
Write-Host ""

Write-Host "=== Debug Complete ===" -ForegroundColor Cyan
