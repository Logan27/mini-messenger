# Test all 3 failing endpoints
$ErrorActionPreference = "Continue"

# Get admin token
$loginBody = @{
    identifier = "admin@messenger.local"
    password = "change_this_admin_password"
} | ConvertTo-Json

Write-Host "=== Admin Login ===" -ForegroundColor Cyan
try {
    $login = Invoke-RestMethod -Uri 'http://localhost:4000/api/auth/login' -Method POST -Body $loginBody -ContentType 'application/json'
    $adminToken = $login.data.tokens.accessToken
    Write-Host "Login successful" -ForegroundColor Green
} catch {
    Write-Host "Login failed: $_" -ForegroundColor Red
    exit 1
}

# Test 1: Admin Stats
Write-Host "`n=== Test 1: Admin Stats ===" -ForegroundColor Cyan
try {
    $headers = @{ Authorization = "Bearer $adminToken" }
    $stats = Invoke-RestMethod -Uri 'http://localhost:4000/api/admin/stats' -Headers $headers
    Write-Host "SUCCESS: Stats retrieved" -ForegroundColor Green
    Write-Host ($stats | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "ERROR: Stats failed" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = [System.IO.StreamReader]::new($stream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Response: $errorBody" -ForegroundColor Yellow
    }
}

# Test 2: Announcements
Write-Host "`n=== Test 2: Announcements ===" -ForegroundColor Cyan
try {
    $headers = @{ Authorization = "Bearer $adminToken" }
    $announcements = Invoke-RestMethod -Uri 'http://localhost:4000/api/announcements' -Headers $headers
    Write-Host "SUCCESS: Announcements retrieved" -ForegroundColor Green
    Write-Host ($announcements | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "ERROR: Announcements failed" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = [System.IO.StreamReader]::new($stream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Response: $errorBody" -ForegroundColor Yellow
    }
}

# Test 3: File Upload (requires creating test user first)
Write-Host "`n=== Test 3: File Upload ===" -ForegroundColor Cyan
$regBody = @{
    username = "testfile$(Get-Random)"
    email = "testfile$(Get-Random)@test.com"
    password = "Test123456#"
    firstName = "Test"
    lastName = "User"
} | ConvertTo-Json

try {
    $reg = Invoke-RestMethod -Uri 'http://localhost:4000/api/auth/register' -Method POST -Body $regBody -ContentType 'application/json'
    $userLoginBody = @{
        identifier = $reg.data.user.email
        password = "Test123456#"
    } | ConvertTo-Json
    $userLogin = Invoke-RestMethod -Uri 'http://localhost:4000/api/auth/login' -Method POST -Body $userLoginBody -ContentType 'application/json'
    $userToken = $userLogin.data.tokens.accessToken
    
    $headers = @{ Authorization = "Bearer $userToken" }
    $filePath = "C:\Users\anton\Documents\messenger\test-files\test-image.png"
    $form = @{ files = Get-Item -Path $filePath }
    
    $upload = Invoke-RestMethod -Uri 'http://localhost:4000/api/files/upload' -Method POST -Form $form -Headers $headers
    Write-Host "SUCCESS: File uploaded" -ForegroundColor Green
    Write-Host ($upload | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "ERROR: File upload failed" -ForegroundColor Red
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Yellow
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = [System.IO.StreamReader]::new($stream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Response: $errorBody" -ForegroundColor Yellow
    }
}
