# Test the complete auth flow to see where tokens break

Write-Host "=== Test 1: Register ==="
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$username = "testuser$timestamp"
$email = "test${timestamp}@example.com"

$regBody = @{
    username = $username
    email = $email
    password = "Test123456#"
    firstName = "Test"
    lastName = "User"
} | ConvertTo-Json

$regResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/register" -ContentType "application/json" -Body $regBody
Write-Host "Register: OK - User ID: $($regResponse.data.user.id)"
$userId = $regResponse.data.user.id

Write-Host ""
Write-Host "=== Test 2: Login ==="
$loginBody = @{
    identifier = $username
    password = "Test123456#"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $loginBody
$token = $loginResponse.data.tokens.accessToken
$refreshToken = $loginResponse.data.tokens.refreshToken
Write-Host "Login: OK"
Write-Host "Token: $($token.Substring(0,50))..."

Write-Host ""
Write-Host "=== Test 3: Get Profile (with token) ==="
try {
    $headers = @{ "Authorization" = "Bearer $token" }
    $profileResponse = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/api/auth/me" -Headers $headers
    Write-Host "Profile: OK - Username: $($profileResponse.data.username)"
} catch {
    Write-Host "Profile: FAILED - $($_.Exception.Message)"
    Write-Host $_.ErrorDetails.Message
}

Write-Host ""
Write-Host "=== Test 4: Refresh Token ==="
try {
    $refreshBody = @{ refreshToken = $refreshToken } | ConvertTo-Json
    $refreshResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/refresh" -ContentType "application/json" -Body $refreshBody
    $newToken = $refreshResponse.data.accessToken
    Write-Host "Refresh: OK"
    Write-Host "New Token: $($newToken.Substring(0,50))..."
    
    # Test if new token works
    Write-Host ""
    Write-Host "=== Test 5: Get Profile (with NEW token) ==="
    $headers2 = @{ "Authorization" = "Bearer $newToken" }
    $profileResponse2 = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/api/auth/me" -Headers $headers2
    Write-Host "Profile with new token: OK - Username: $($profileResponse2.data.username)"
    
} catch {
    Write-Host "Refresh: FAILED - $($_.Exception.Message)"
    Write-Host $_.ErrorDetails.Message
}

Write-Host ""
Write-Host "=== Test 6: Send Message (with token from login) ==="
try {
    $msgBody = @{
        recipientId = $userId
        content = "Test message"
    } | ConvertTo-Json
    $headers3 = @{ "Authorization" = "Bearer $token" }
    $msgResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/messages" -Headers $headers3 -ContentType "application/json" -Body $msgBody
    Write-Host "Message: OK - Message ID: $($msgResponse.data.id)"
} catch {
    Write-Host "Message: FAILED - $($_.Exception.Message)"
    Write-Host $_.ErrorDetails.Message
}

Write-Host ""
Write-Host "=== Test 7: Get User Profile /users/me (with token) ==="
try {
    $headers4 = @{ "Authorization" = "Bearer $token" }
    $userMeResponse = Invoke-RestMethod -Method GET -Uri "http://localhost:4000/api/users/me" -Headers $headers4
    Write-Host "User Profile: OK - Username: $($userMeResponse.data.username)"
} catch {
    Write-Host "User Profile: FAILED - $($_.Exception.Message)"
    Write-Host $_.ErrorDetails.Message
}
