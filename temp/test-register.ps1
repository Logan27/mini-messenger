$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$username = "testuser$timestamp"
$email = "test${timestamp}@example.com"
$password = "Test123456#"

$body = @{
    username = $username
    email = $email
    password = $password
    firstName = "Test"
    lastName = "User"
} | ConvertTo-Json

Write-Host "Registering user: $username / $email"
Write-Host ""

try {
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/register" -ContentType "application/json" -Body $body
    Write-Host "✓ Registration SUCCESS:"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Registration FAILED:"
    $errorMsg = $_.Exception.Message
    Write-Host "Error: $errorMsg"
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    }
}
