$body = @{
    identifier = "admin@messenger.local"
    password = "change_this_admin_password"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $body
    Write-Host "Success:"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error Status: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Error Message:"
    $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body:"
        Write-Host $responseBody
    }
}
