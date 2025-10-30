# Quick test of group operations
$timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$username = "quicktest$timestamp"

$registerBody = @{ username = $username; email = "$username@test.com"; password = "Test123456#"; firstName = "Quick"; lastName = "Test" } | ConvertTo-Json
$regResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/register" -ContentType "application/json" -Body $registerBody
$loginBody = @{ identifier = $username; password = "Test123456#" } | ConvertTo-Json
$loginResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $loginBody
$token = $loginResponse.data.tokens.accessToken
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "User: $username" -ForegroundColor Green

# Create group
$createGroupBody = @{ name = "Test Group"; description = "Test"; groupType = "private" } | ConvertTo-Json
$group = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/groups" -Headers $headers -ContentType "application/json" -Body $createGroupBody
$groupId = $group.data.id
Write-Host "Group created: $groupId" -ForegroundColor Green

# Update group
$updateGroupBody = @{ description = "Updated" } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Method PUT -Uri "http://localhost:4000/api/groups/$groupId" -Headers $headers -ContentType "application/json" -Body $updateGroupBody
    Write-Host "Group updated: SUCCESS" -ForegroundColor Green
} catch {
    Write-Host "Group update FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# Delete group
try {
    $response = Invoke-RestMethod -Method DELETE -Uri "http://localhost:4000/api/groups/$groupId" -Headers $headers
    Write-Host "Group deleted: SUCCESS" -ForegroundColor Green
} catch {
    Write-Host "Group delete FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
