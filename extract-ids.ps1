param($FilePath, $JsonPath)
try {
    $json = Get-Content $FilePath | ConvertFrom-Json
    $path = $JsonPath -split '\.'
    $value = $json
    foreach ($p in $path) {
        if ($p -match '(\w+)\[(\d+)\]') {
            $arrayName = $matches[1]
            $index = [int]$matches[2]
            $value = $value.$arrayName[$index]
        } else {
            $value = $value.$p
        }
    }
    Write-Output $value
} catch {
    # Silently fail - return nothing
}
