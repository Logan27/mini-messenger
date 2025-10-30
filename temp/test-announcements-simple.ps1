# Simple announcements test
$login = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body (@{
    identifier = "admin"
    password = "change_this_admin_password"
} | ConvertTo-Json)

Write-Host "Login successful" -ForegroundColor Green
$token = $login.data.tokens.accessToken

Write-Host "Testing announcements..." -ForegroundColor Yellow
$headers = @{ "Authorization" = "Bearer $token" }

try {
    # Use Invoke-WebRequest for full response details
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/announcements" -Headers $headers -Method Get
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)"
    Write-Host "Content: $($response.Content)"
} catch {
    Write-Host "FAILED!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Error Message: $($_.Exception.Message)"
    
    # Try to read error stream
    try {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = [System.IO.StreamReader]::new($errorStream)
        $errorText = $reader.ReadToEnd()
        Write-Host "Error Body: $errorText"
    } catch {
        Write-Host "Could not read error body"
    }
}
