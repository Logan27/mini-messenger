# Test group creation specifically
$timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$username = "grouptest$timestamp"

$registerBody = @{ username = $username; email = "$username@test.com"; password = "Test123456#"; firstName = "Group"; lastName = "Test" } | ConvertTo-Json
$regResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/register" -ContentType "application/json" -Body $registerBody
$loginBody = @{ identifier = $username; password = "Test123456#" } | ConvertTo-Json
$loginResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $loginBody
$token = $loginResponse.data.tokens.accessToken
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "User: $username"
Write-Host "Creating group..."

$groupBody = @{ name = "Test Group $timestamp"; description = "Test"; groupType = "private" } | ConvertTo-Json

try {
    $webResponse = Invoke-WebRequest -Method POST -Uri "http://localhost:4000/api/groups" -Headers $headers -ContentType "application/json" -Body $groupBody -UseBasicParsing
    $response = $webResponse.Content | ConvertFrom-Json
    Write-Host "SUCCESS - Group created: $($response.data.id)" -ForegroundColor Green
} catch {
    Write-Host "FAILED" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    
    $errorStream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($errorStream)
    $errorBody = $reader.ReadToEnd()
    $reader.Close()
    $errorStream.Close()
    
    Write-Host "Error Body: $errorBody" -ForegroundColor Red
    
    # Parse JSON for debug info
    if ($errorBody) {
        try {
            $errorObj = $errorBody | ConvertFrom-Json
            if ($errorObj.error.debug) {
                Write-Host "Debug Message: $($errorObj.error.debug)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "Could not parse error JSON" -ForegroundColor Gray
        }
    }
}
