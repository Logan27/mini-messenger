# Detailed debugging of all HTTP 500 errors
$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Debugging HTTP 500 Errors - Detailed" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Login as admin
$adminLogin = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body (@{
    identifier = "admin"
    password = "change_this_admin_password"
} | ConvertTo-Json)
$adminToken = $adminLogin.data.tokens.accessToken
Write-Host "✓ Admin logged in" -ForegroundColor Green
Write-Host ""

# Test 1: Password Change
Write-Host "1. Testing Password Change" -ForegroundColor Yellow
Write-Host "   Creating fresh user..." -ForegroundColor Gray
$timestamp = [int](Get-Date -UFormat %s)
$testUser = @{
    username = "pwdtest$timestamp"
    email = "pwdtest$timestamp@test.com"
    password = "Test123456#"
} | ConvertTo-Json

try {
    $reg = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/register" -ContentType "application/json" -Body $testUser
    $login = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body (@{
        identifier = "pwdtest$timestamp@test.com"
        password = "Test123456#"
    } | ConvertTo-Json)
    
    $token = $login.data.tokens.accessToken
    $changeBody = @{
        currentPassword = "Test123456#"
        newPassword = "NewTest123456#"
        confirmPassword = "NewTest123456#"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Method POST -Uri "http://localhost:4000/api/auth/change-password" -Headers @{ "Authorization" = "Bearer $token" } -ContentType "application/json" -Body $changeBody
    Write-Host "   ✓ SUCCESS - Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   ✗ FAILED - Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        if ($errorBody) {
            Write-Host "   Error: $errorBody" -ForegroundColor Gray
        } else {
            Write-Host "   Error: (empty response body)" -ForegroundColor Gray
        }
    }
    Write-Host "   Exception: $($_.Exception.Message)" -ForegroundColor DarkGray
}
Write-Host ""

# Test 2: File Upload
Write-Host "2. Testing File Upload" -ForegroundColor Yellow
$filePath = "C:\Users\anton\Documents\messenger\test-files\test-image.png"
if (Test-Path $filePath) {
    try {
        $form = @{
            files = Get-Item $filePath
        }
        $response = Invoke-WebRequest -Method POST -Uri "http://localhost:4000/api/files/upload" -Headers @{ "Authorization" = "Bearer $adminToken" } -Form $form
        Write-Host "   ✓ SUCCESS - Status: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "   ✗ FAILED - Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            if ($errorBody) {
                Write-Host "   Error: $errorBody" -ForegroundColor Gray
            } else {
                Write-Host "   Error: (empty response body)" -ForegroundColor Gray
            }
        }
        Write-Host "   Exception: $($_.Exception.Message)" -ForegroundColor DarkGray
    }
} else {
    Write-Host "   ⊘ SKIPPED - Test file not found" -ForegroundColor Yellow
}
Write-Host ""

# Test 3: Announcements
Write-Host "3. Testing Announcements" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Method GET -Uri "http://localhost:4000/api/announcements" -Headers @{ "Authorization" = "Bearer $adminToken" }
    Write-Host "   ✓ SUCCESS - Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   ✗ FAILED - Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        if ($errorBody) {
            Write-Host "   Error: $errorBody" -ForegroundColor Gray
        } else {
            Write-Host "   Error: (empty response body)" -ForegroundColor Gray
        }
    }
    Write-Host "   Exception: $($_.Exception.Message)" -ForegroundColor DarkGray
}
Write-Host ""

# Test 4: Admin Stats
Write-Host "4. Testing Admin Stats" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Method GET -Uri "http://localhost:4000/api/admin/stats" -Headers @{ "Authorization" = "Bearer $adminToken" }
    Write-Host "   ✓ SUCCESS - Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   ✗ FAILED - Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        if ($errorBody) {
            Write-Host "   Error: $errorBody" -ForegroundColor Gray
        } else {
            Write-Host "   Error: (empty response body)" -ForegroundColor Gray
        }
    }
    Write-Host "   Exception: $($_.Exception.Message)" -ForegroundColor DarkGray
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Check backend console for detailed error logs" -ForegroundColor Yellow
