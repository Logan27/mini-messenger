# Test password change endpoint
$ErrorActionPreference = "Continue"

# Register user
$regBody = @{
    username = "testpwd$([int](Get-Date -UFormat %s))"
    email = "testpwd$([int](Get-Date -UFormat %s))@test.com"
    password = "Test123456#"
    firstName = "Test"
    lastName = "User"
} | ConvertTo-Json

Write-Host "Registering user..."
try {
    $reg = Invoke-RestMethod -Uri 'http://localhost:4000/api/auth/register' -Method POST -Body $regBody -ContentType 'application/json'
    Write-Host "Registration successful: $($reg.data.user.email)"
} catch {
    Write-Host "Registration failed: $_"
    exit 1
}

# Login
$loginBody = @{
    identifier = $reg.data.user.email
    password = "Test123456#"
} | ConvertTo-Json

Write-Host "Logging in..."
try {
    $login = Invoke-RestMethod -Uri 'http://localhost:4000/api/auth/login' -Method POST -Body $loginBody -ContentType 'application/json'
    $token = $login.data.tokens.accessToken
    Write-Host "Login successful, token: $($token.Substring(0,20))..."
} catch {
    Write-Host "Login failed: $_"
    exit 1
}

# Change password
$changeBody = @{
    currentPassword = "Test123456#"
    newPassword = "NewPass123#"
    confirmPassword = "NewPass123#"
} | ConvertTo-Json

Write-Host "Changing password..."
try {
    $headers = @{
        Authorization = "Bearer $token"
    }
    $result = Invoke-RestMethod -Uri 'http://localhost:4000/api/auth/change-password' -Method POST -Body $changeBody -ContentType 'application/json' -Headers $headers
    Write-Host "SUCCESS: Password changed successfully!"
    Write-Host ($result | ConvertTo-Json)
} catch {
    Write-Host "ERROR: Password change failed"
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = [System.IO.StreamReader]::new($stream)
    $errorBody = $reader.ReadToEnd()
    Write-Host "Response: $errorBody"
}
