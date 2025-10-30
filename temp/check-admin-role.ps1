$adminLoginBody = @{ identifier = "admin"; password = "change_this_admin_password" } | ConvertTo-Json
$adminLogin = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $adminLoginBody

Write-Host "User Object:"
$adminLogin.data.user | Format-List

Write-Host "`nRole specifically:"
Write-Host "Role: '$($adminLogin.data.user.role)'" -ForegroundColor Yellow

# Try admin endpoint
$adminToken = $adminLogin.data.tokens.accessToken
$headers = @{ "Authorization" = "Bearer $adminToken" }

Write-Host "`nTrying /api/admin/stats..."
try {
    $stats = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/api/admin/stats" -Headers $headers
    Write-Host "SUCCESS!" -ForegroundColor Green
    $stats.data | Format-List
} catch {
    $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { "Unknown" }
    Write-Host "FAILED with status: $statusCode" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
    if ($_.Exception.Response) {
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            Write-Host "Response: $errorBody" -ForegroundColor Gray
        } catch {}
    }
}
