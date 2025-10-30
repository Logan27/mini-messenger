# Test admin endpoints with proper token
Write-Host "Testing Admin Endpoints" -ForegroundColor Cyan

# Admin login
$adminLoginBody = @{ identifier = "admin"; password = "change_this_admin_password" } | ConvertTo-Json
$adminLogin = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $adminLoginBody
$adminToken = $adminLogin.data.tokens.accessToken
$adminUserId = $adminLogin.data.user.id
$adminHeaders = @{ "Authorization" = "Bearer $adminToken" }

Write-Host "Admin Token: $($adminToken.Substring(0,40))..." -ForegroundColor Green
Write-Host "Admin User ID: $adminUserId" -ForegroundColor Green
Write-Host "Admin Username: $($adminLogin.data.user.username)" -ForegroundColor Green
Write-Host "Admin Role: $($adminLogin.data.user.role)" -ForegroundColor Green
Write-Host ""

# Test admin stats
Write-Host "1. GET /api/admin/stats" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/api/admin/stats" -Headers $adminHeaders
    Write-Host "   PASS - Got stats" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "   FAIL - HTTP $statusCode" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host "   Error: $errorBody" -ForegroundColor Gray
}
Write-Host ""

# Test admin users list
Write-Host "2. GET /api/admin/users" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/api/admin/users" -Headers $adminHeaders
    Write-Host "   PASS - Got $($response.data.users.Count) users" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "   FAIL - HTTP $statusCode" -ForegroundColor Red
}
Write-Host ""

# Test announcements (user endpoint)
Write-Host "3. GET /api/announcements" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/api/announcements" -Headers $adminHeaders
    Write-Host "   PASS - Got $($response.data.announcements.Count) announcements" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "   FAIL - HTTP $statusCode" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host "   Error: $errorBody" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Done" -ForegroundColor Cyan
