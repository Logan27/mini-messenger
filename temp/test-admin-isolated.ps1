# Test admin login in isolation
Write-Host "Testing Admin Login in Isolation" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if backend is healthy
Write-Host "1. Health Check" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/health"
    Write-Host "   Backend healthy - Uptime: $($health.uptime)s" -ForegroundColor Green
} catch {
    Write-Host "   Backend NOT healthy!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: Try announcements endpoint (where crash happens)
Write-Host "2. GET /api/announcements (unauthenticated)" -ForegroundColor Yellow
try {
    $announcements = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/api/announcements"
    Write-Host "   SUCCESS - Got $($announcements.data.announcements.Count) announcements" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "   Status: $statusCode" -ForegroundColor $(if($statusCode -eq 200){"Green"}else{"Yellow"})
}
Write-Host ""

# Test 3: Check health again
Write-Host "3. Health Check After Announcements" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/health"
    Write-Host "   Backend still healthy - Uptime: $($health.uptime)s" -ForegroundColor Green
} catch {
    Write-Host "   Backend CRASHED after announcements!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 4: Admin login
Write-Host "4. Admin Login" -ForegroundColor Yellow
$adminLoginBody = @{ identifier = "admin"; password = "change_this_admin_password" } | ConvertTo-Json
try {
    $adminLogin = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $adminLoginBody
    $adminToken = $adminLogin.data.tokens.accessToken
    Write-Host "   SUCCESS - Admin logged in" -ForegroundColor Green
    Write-Host "   Token: $($adminToken.Substring(0,40))..." -ForegroundColor Gray
    Write-Host "   User ID: $($adminLogin.data.user.id)" -ForegroundColor Gray
} catch {
    Write-Host "   FAILED - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Check health after admin login
Write-Host "5. Final Health Check" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/health"
    Write-Host "   Backend healthy - Uptime: $($health.uptime)s" -ForegroundColor Green
} catch {
    Write-Host "   Backend crashed!" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test Complete" -ForegroundColor Cyan
