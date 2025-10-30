# Test all failing endpoints with detailed error output

Write-Host "=== Testing All Failed Endpoints ===" -ForegroundColor Cyan
Write-Host ""

$timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$username = "failtest$timestamp"
$password = "Test123456#"

# Setup - Register and login
$registerBody = @{ 
    username = $username
    email = "$username@test.com"
    password = $password
    firstName = "Fail"
    lastName = "Test"
} | ConvertTo-Json

$regResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/register" -ContentType "application/json" -Body $registerBody
$loginBody = @{ identifier = $username; password = $password } | ConvertTo-Json
$loginResponse = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/login" -ContentType "application/json" -Body $loginBody
$token = $loginResponse.data.tokens.accessToken
$userId = $loginResponse.data.user.id
$headers = @{ "Authorization" = "Bearer $token" }

Write-Host "User created: $username (ID: $userId)" -ForegroundColor Green
Write-Host ""

# Test 1: Change Password
Write-Host "1. POST /api/auth/change-password" -ForegroundColor Yellow
$changePassBody = @{ 
    currentPassword = $password
    newPassword = "NewPass123456#"
} | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/change-password" -Headers $headers -ContentType "application/json" -Body $changePassBody
    Write-Host "   PASS" -ForegroundColor Green
} catch {
    Write-Host "   FAIL - $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host "   Error: $errorBody" -ForegroundColor Gray
}
Write-Host ""

# Test 2: Add Contact (need another user first)
Write-Host "2. POST /api/contacts - Add Contact" -ForegroundColor Yellow
$otherUsername = "other$timestamp"
$otherRegBody = @{ 
    username = $otherUsername
    email = "$otherUsername@test.com"
    password = $password
    firstName = "Other"
    lastName = "User"
} | ConvertTo-Json
$otherUser = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/auth/register" -ContentType "application/json" -Body $otherRegBody
$otherUserId = $otherUser.data.user.id

$addContactBody = @{ contactUserId = $otherUserId } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/contacts" -Headers $headers -ContentType "application/json" -Body $addContactBody
    Write-Host "   PASS - Contact ID: $($response.data.id)" -ForegroundColor Green
    $contactId = $response.data.id
} catch {
    Write-Host "   FAIL - $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host "   Error: $errorBody" -ForegroundColor Gray
}
Write-Host ""

# Test 3: Block Contact
Write-Host "3. POST /api/contacts/{id}/block - Block Contact" -ForegroundColor Yellow
if ($contactId) {
    try {
        $response = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/contacts/$contactId/block" -Headers $headers
        Write-Host "   PASS" -ForegroundColor Green
    } catch {
        Write-Host "   FAIL - $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Error: $errorBody" -ForegroundColor Gray
    }
} else {
    Write-Host "   SKIP - No contact ID" -ForegroundColor Yellow
}
Write-Host ""

# Test 4: Update Group
Write-Host "4. PUT /api/groups/{id} - Update Group" -ForegroundColor Yellow
$createGroupBody = @{ name = "Test Group"; description = "Test"; groupType = "private" } | ConvertTo-Json
$group = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/groups" -Headers $headers -ContentType "application/json" -Body $createGroupBody
$groupId = $group.data.id
Write-Host "   Created group: $groupId" -ForegroundColor Gray

$updateGroupBody = @{ description = "Updated description" } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Method PUT -Uri "http://localhost:4000/api/groups/$groupId" -Headers $headers -ContentType "application/json" -Body $updateGroupBody
    Write-Host "   PASS" -ForegroundColor Green
} catch {
    Write-Host "   FAIL - $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host "   Error: $errorBody" -ForegroundColor Gray
}
Write-Host ""

# Test 5: Delete Group
Write-Host "5. DELETE /api/groups/{id} - Delete Group" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Method DELETE -Uri "http://localhost:4000/api/groups/$groupId" -Headers $headers
    Write-Host "   PASS" -ForegroundColor Green
} catch {
    Write-Host "   FAIL - $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host "   Error: $errorBody" -ForegroundColor Gray
}
Write-Host ""

# Test 6: Upload File
Write-Host "6. POST /api/files/upload - Upload File" -ForegroundColor Yellow
$testFilePath = "C:\Users\anton\Documents\messenger\temp\test-file.txt"
"Test file content" | Out-File -FilePath $testFilePath -Encoding UTF8
try {
    $fileBytes = [System.IO.File]::ReadAllBytes($testFilePath)
    $fileContent = [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($fileBytes)
    
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    $bodyLines = (
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"test-file.txt`"",
        "Content-Type: text/plain$LF",
        $fileContent,
        "--$boundary--$LF"
    ) -join $LF
    
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/files/upload" `
        -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "multipart/form-data; boundary=$boundary" } `
        -Body $bodyLines
    Write-Host "   PASS - File ID: $($response.data.id)" -ForegroundColor Green
} catch {
    Write-Host "   FAIL - $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host "   Error: $errorBody" -ForegroundColor Gray
}
Remove-Item $testFilePath -ErrorAction SilentlyContinue
Write-Host ""

# Test 7: Mark All Notifications Read
Write-Host "7. PUT /api/notifications/mark-all-read" -ForegroundColor Yellow
$markBody = @{} | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Method PUT -Uri "http://localhost:4000/api/notifications/mark-all-read" -Headers $headers -ContentType "application/json" -Body $markBody
    Write-Host "   PASS" -ForegroundColor Green
} catch {
    Write-Host "   FAIL - $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host "   Error: $errorBody" -ForegroundColor Gray
}
Write-Host ""

# Test 8: Update Notification Settings
Write-Host "8. PUT /api/notification-settings" -ForegroundColor Yellow
$settingsBody = @{ emailEnabled = $false; pushEnabled = $true } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Method PUT -Uri "http://localhost:4000/api/notification-settings" -Headers $headers -ContentType "application/json" -Body $settingsBody
    Write-Host "   PASS" -ForegroundColor Green
} catch {
    Write-Host "   FAIL - $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host "   Error: $errorBody" -ForegroundColor Gray
}
Write-Host ""

# Test 9: Reset Notification Settings
Write-Host "9. POST /api/notification-settings/reset" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/notification-settings/reset" -Headers $headers
    Write-Host "   PASS" -ForegroundColor Green
} catch {
    Write-Host "   FAIL - $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host "   Error: $errorBody" -ForegroundColor Gray
}
Write-Host ""

# Test 10: Delete Account
Write-Host "10. DELETE /api/users/me - Delete Account" -ForegroundColor Yellow
$deleteBody = @{ password = $password; reason = "Testing" } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Method DELETE -Uri "http://localhost:4000/api/users/me" -Headers $headers -ContentType "application/json" -Body $deleteBody
    Write-Host "   PASS" -ForegroundColor Green
} catch {
    Write-Host "   FAIL - $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $errorBody = $reader.ReadToEnd()
    Write-Host "   Error: $errorBody" -ForegroundColor Gray
}
Write-Host ""

Write-Host "=== Tests Complete ===" -ForegroundColor Cyan
