param(
    [Parameter(Mandatory=$true)][string]$Method,
    [Parameter(Mandatory=$true)][string]$Url,
    [Parameter()][string]$HeadersJson,
    [Parameter()][string]$BodyJson
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($HeadersJson)) {
    $Headers = @{ 'Content-Type' = 'application/json' }
} else {
    $Headers = $HeadersJson | ConvertFrom-Json
}

if (-not [string]::IsNullOrWhiteSpace($BodyJson)) {
    $response = Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers -Body $BodyJson
} else {
    $response = Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers
}

$response | ConvertTo-Json -Depth 10
