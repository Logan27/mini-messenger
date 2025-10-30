param($FilePath, $JsonPath)

# Enhanced ID extraction script with better error handling and multiple fallback paths
try {
    # Check if file exists
    if (-not (Test-Path $FilePath)) {
        # Try to get ID from temp file if the original file doesn't exist
        $tempIdFile = $FilePath -replace '\.json$', '_id.txt'
        if (Test-Path $tempIdFile) {
            $id = Get-Content $tempIdFile -Raw
            if (-not [string]::IsNullOrWhiteSpace($id)) {
                Write-Output $id.Trim()
                exit 0
            }
        }
        Write-Warning "File not found: $FilePath"
        exit 1
    }
    
    $content = Get-Content $FilePath -Raw
    if ([string]::IsNullOrWhiteSpace($content)) {
        Write-Warning "Empty file: $FilePath"
        exit 1
    }
    
    $json = $content | ConvertFrom-Json
    
    # Function to extract value using JSON path with fallbacks
    function Extract-Value {
        param($obj, $pathString)
        
        $path = $pathString -split '\.'
        $value = $obj
        
        foreach ($p in $path) {
            if ($p -match '(\w+)\[(\d+)\]') {
                $arrayName = $matches[1]
                $index = [int]$matches[2]
                if ($value.$arrayName -and $value.$arrayName.Count -gt $index) {
                    $value = $value.$arrayName[$index]
                } else {
                    return $null
                }
            } else {
                if ($value.$p) {
                    $value = $value.$p
                } else {
                    return $null
                }
            }
        }
        return $value
    }
    
    # Try the primary path first
    $value = Extract-Value -obj $json -pathString $JsonPath
    
    # If primary path fails, try common fallback patterns
    if (-not $value) {
        # Fallback patterns for different response formats
        $fallbackPaths = @()
        
        # Common patterns for ID extraction
        if ($JsonPath -eq "data.id") {
            $fallbackPaths = @(
                "id",
                "data._id",
                "_id",
                "data.message.id",
                "message.id",
                "data.group.id",
                "group.id",
                "data.file.id",
                "file.id",
                "data.contact.id",
                "contact.id",
                "data.notification.id",
                "notification.id",
                "data.announcement.id",
                "announcement.id",
                "data.user.id",
                "user.id"
            )
        }
        elseif ($JsonPath -eq "files[0].id") {
            $fallbackPaths = @(
                "data.files[0].id",
                "files[0].id",
                "data.file.id",
                "file.id",
                "data.id",
                "id"
            )
        }
        elseif ($JsonPath -eq "data.notifications[0].id") {
            $fallbackPaths = @(
                "notifications[0].id",
                "data[0].id",
                "data.items[0].id",
                "items[0].id"
            )
        }
        
        # Try each fallback path
        foreach ($fallbackPath in $fallbackPaths) {
            $value = Extract-Value -obj $json -pathString $fallbackPath
            if ($value) {
                break
            }
        }
    }
    
    if ($value) {
        Write-Output $value
    } else {
        # Debug: Output the JSON structure for troubleshooting
        Write-Warning "Could not extract ID using path '$JsonPath' from $FilePath"
        Write-Warning "JSON structure: $($json | ConvertTo-Json -Compress)"
    }
    
} catch {
    Write-Warning "Error extracting ID: $($_.Exception.Message)"
    # Debug: Output file content for troubleshooting
    if (Test-Path $FilePath) {
        Write-Warning "File content: $(Get-Content $FilePath -Raw)"
    }
}