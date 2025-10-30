$body = @{
    identifier = "admin"
    password = "Admin123!@#"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -Headers @{ "Content-Type" = "application/json" } -Body $body -ErrorAction Stop
    Write-Host "SUCCESS: Admin login worked"
    Write-Host "Token received"
    Write-Host "User: $($response.user.username) - Role: $($response.user.role)"
} catch {
    Write-Host "FAILED: Admin login failed"
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    try {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error: $errorBody"
    } catch {
        Write-Host "Could not read error response"
    }
}
