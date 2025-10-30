# Test file upload endpoint
$ErrorActionPreference = "Continue"

# Register and login
$regBody = @{
    username = "testfile$([int](Get-Date -UFormat %s))"
    email = "testfile$([int](Get-Date -UFormat %s))@test.com"
    password = "Test123456#"
    firstName = "Test"
    lastName = "User"
} | ConvertTo-Json

Write-Host "Registering user..."
try {
    $reg = Invoke-RestMethod -Uri 'http://localhost:4000/api/auth/register' -Method POST -Body $regBody -ContentType 'application/json'
    Write-Host "Registration successful"
} catch {
    Write-Host "Registration failed: $_"
    exit 1
}

$loginBody = @{
    identifier = $reg.data.user.email
    password = "Test123456#"
} | ConvertTo-Json

Write-Host "Logging in..."
try {
    $login = Invoke-RestMethod -Uri 'http://localhost:4000/api/auth/login' -Method POST -Body $loginBody -ContentType 'application/json'
    $token = $login.data.tokens.accessToken
    Write-Host "Login successful"
} catch {
    Write-Host "Login failed: $_"
    exit 1
}

# Upload file
Write-Host "Uploading file..."
try {
    $filePath = "C:\Users\anton\Documents\messenger\test-files\test-image.png"
    $headers = @{
        Authorization = "Bearer $token"
    }
    
    $form = @{
        files = Get-Item -Path $filePath
    }
    
    $result = Invoke-RestMethod -Uri 'http://localhost:4000/api/files/upload' -Method POST -Form $form -Headers $headers
    Write-Host "SUCCESS: File uploaded!"
    Write-Host ($result | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "ERROR: File upload failed"
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = [System.IO.StreamReader]::new($stream)
    $errorBody = $reader.ReadToEnd()
    Write-Host "Response: $errorBody"
}
