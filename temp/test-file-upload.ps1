# Test file upload to see exact error
$loginBody = @{
    identifier = "admin"
    password = "change_this_admin_password"
} | ConvertTo-Json

$login = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $loginBody
$token = $login.data.tokens.accessToken
Write-Host "Logged in as: $($login.data.user.username)" -ForegroundColor Green
Write-Host ""

$headers = @{ "Authorization" = "Bearer $token" }
$filePath = "C:\Users\anton\Documents\messenger\test-files\test-image.png"

Write-Host "Uploading file: $filePath" -ForegroundColor Yellow
try {
    $form = @{
        files = Get-Item $filePath
    }
    $result = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/files/upload" -Headers $headers -Form $form
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "File ID: $($result.files[0].id)"
} catch {
    Write-Host "FAILED!" -ForegroundColor Red
    $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { "Unknown" }
    Write-Host "Status: $statusCode"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error Response: $errorBody" -ForegroundColor Gray
    }
}
