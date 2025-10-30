$loginBody = @{
    identifier = "admin"
    password = "change_this_admin_password"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $loginBody
$refreshToken = $loginResponse.data.tokens.refreshToken

Write-Host "=== Refresh Token Response Structure ==="
$refreshBody = @{ refreshToken = $refreshToken } | ConvertTo-Json
$refreshResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/refresh" -ContentType "application/json" -Body $refreshBody

Write-Host "Full Response:"
$refreshResponse | ConvertTo-Json -Depth 5

Write-Host ""
Write-Host "Trying to extract accessToken from data.accessToken:"
Write-Host $refreshResponse.data.accessToken

Write-Host ""
Write-Host "Trying to extract accessToken from data.tokens.accessToken:"
Write-Host $refreshResponse.data.tokens.accessToken
