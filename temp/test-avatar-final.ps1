# Test avatar upload with fixed backend

Write-Host "=== Testing Avatar Upload ===" -ForegroundColor Cyan
Write-Host ""

# Login
Write-Host "1. Logging in..."
$loginBody = @{
    identifier = "admin"
    password = "change_this_admin_password"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.data.tokens.accessToken
    Write-Host "   Login: OK" -ForegroundColor Green
} catch {
    Write-Host "   Login: FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# Upload avatar
Write-Host ""
Write-Host "2. Uploading avatar..."
$filePath = "C:\Users\anton\Documents\messenger\test-files\test-image.png"

try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $form = @{
        avatar = Get-Item -Path $filePath
    }
    
    $uploadResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/users/me/avatar" -Headers $headers -Form $form
    
    Write-Host "   Avatar Upload: OK" -ForegroundColor Green
    Write-Host "   Avatar URL: $($uploadResponse.data.avatar)" -ForegroundColor Gray
    
} catch {
    Write-Host "   Avatar Upload: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    if ($_.ErrorDetails.Message) {
        $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   Details: $($errorObj.error.message)" -ForegroundColor Yellow
        if ($errorObj.error.details) {
            Write-Host "   $($errorObj.error.details)" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
