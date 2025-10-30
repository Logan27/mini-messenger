$loginBody = @{
    identifier = "admin"
    password = "change_this_admin_password"
} | ConvertTo-Json

Write-Host "1. Logging in..."
$loginResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $loginBody
$token = $loginResponse.data.tokens.accessToken
$userId = $loginResponse.data.user.id

Write-Host "Token: $($token.Substring(0,20))..."
Write-Host "User ID: $userId"
Write-Host ""

Write-Host "2. Sending message to self..."
$msgBody = @{
    recipientId = $userId
    content = "Test message"
} | ConvertTo-Json

try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/messages" -Headers $headers -Body $msgBody
    Write-Host "SUCCESS:"
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "FAILED:"
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    }
}
