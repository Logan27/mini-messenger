$body = @{
    identifier = "testuser1761148878"
    password = "Test123456#"
} | ConvertTo-Json

Write-Host "Testing login..."
try {
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $body
    Write-Host "SUCCESS:"
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "FAILED:"
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    }
}
