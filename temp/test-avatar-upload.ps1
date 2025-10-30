# Test avatar upload to capture the crash error

$loginBody = @{
    identifier = "admin"
    password = "change_this_admin_password"
} | ConvertTo-Json

Write-Host "1. Logging in..."
$loginResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $loginBody
$token = $loginResponse.data.tokens.accessToken
Write-Host "Login OK"

Write-Host ""
Write-Host "2. Uploading avatar..."
try {
    $filePath = "C:\Users\anton\Documents\messenger\test-files\test-image.png"
    $boundary = [System.Guid]::NewGuid().ToString()
    
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $uploadResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/users/me/avatar" -Headers $headers -InFile $filePath -ContentType "multipart/form-data"
    
    Write-Host "Upload SUCCESS:"
    $uploadResponse | ConvertTo-Json -Depth 5
    
} catch {
    Write-Host "Upload FAILED:"
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.ErrorDetails.Message) {
        Write-Host "Details:"
        Write-Host $_.ErrorDetails.Message
    }
}
