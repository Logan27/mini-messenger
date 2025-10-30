# Test announcements endpoint
$loginBody = @{
    identifier = "admin"
    password = "change_this_admin_password"
} | ConvertTo-Json

$login = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $loginBody
$token = $login.data.tokens.accessToken
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "Testing /api/announcements..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/api/announcements" -Headers $headers
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Found $($result.data.Count) announcements"
} catch {
    Write-Host "FAILED!" -ForegroundColor Red
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Status: $statusCode"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host "Error: $errorBody" -ForegroundColor Gray
}
