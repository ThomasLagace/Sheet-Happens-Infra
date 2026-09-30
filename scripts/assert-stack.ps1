#Requires -Version 5.1
<#
.SYNOPSIS
  Smoke-assert the local Compose stack (Nginx + API + frontend).

.DESCRIPTION
  Safe to re-run. Exits non-zero on the first hard failure.
  Use: make smoke | make smoke-from-scratch | .\scripts\assert-stack.ps1

.PARAMETER BaseUrl
  Public origin (default http://127.0.0.1).

.PARAMETER TimeoutSec
  Max seconds to wait for compose services to become healthy.
#>
param(
    [string]$BaseUrl = 'http://127.0.0.1',
    [int]$TimeoutSec = 300
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

function Write-Step([string]$Message) {
    Write-Host "OK  $Message"
}

function Invoke-Http {
    param(
        [string]$Method = 'GET',
        [Parameter(Mandatory = $true)][string]$Uri,
        [hashtable]$Headers = @{},
        # Untyped so omitted calls stay $null (a [string]$null becomes "").
        $Body = $null,
        [string]$CookieJar = $null
    )
    $hdrFile = Join-Path $env:TEMP ("assert-stack-hdr-{0}.txt" -f [guid]::NewGuid().ToString('N'))
    $bodyFile = Join-Path $env:TEMP ("assert-stack-body-{0}.bin" -f [guid]::NewGuid().ToString('N'))
    # Prefer --url so a lone "-" never eats the target (PS/curl arg quirks).
    $curlArgs = @(
        '--silent', '--show-error',
        '--dump-header', $hdrFile,
        '--output', $bodyFile,
        '--write-out', '%{http_code}:%{time_total}:%{size_download}',
        '--request', $Method,
        '--url', $Uri
    )
    foreach ($k in $Headers.Keys) {
        $curlArgs += @('--header', "${k}: $($Headers[$k])")
    }
    if ($CookieJar) {
        $curlArgs += @('--cookie-jar', $CookieJar, '--cookie', $CookieJar)
    }
    $payloadFile = $null
    if ($null -ne $Body -and "$Body" -ne '') {
        # File + --data-binary avoids PowerShell eating JSON quotes in --data.
        $payloadFile = Join-Path $env:TEMP ("assert-stack-payload-{0}.json" -f [guid]::NewGuid().ToString('N'))
        [System.IO.File]::WriteAllText($payloadFile, "$Body")
        $curlArgs += @('--data-binary', "@$payloadFile")
    }
    # Sanctum stateful requests need a matching browser Origin.
    if (-not $Headers.ContainsKey('Origin')) {
        $curlArgs += @('--header', 'Origin: http://127.0.0.1')
    }
    if (-not $Headers.ContainsKey('Referer')) {
        $curlArgs += @('--header', 'Referer: http://127.0.0.1/')
    }
    $metaLine = & curl.exe @curlArgs
    $exit = $LASTEXITCODE
    $headerPart = if (Test-Path $hdrFile) { Get-Content -Raw $hdrFile } else { '' }
    $responseBody = if (Test-Path $bodyFile) { Get-Content -Raw $bodyFile } else { '' }
    Remove-Item $hdrFile, $bodyFile -ErrorAction SilentlyContinue
    if ($payloadFile) { Remove-Item $payloadFile -ErrorAction SilentlyContinue }
    if ($exit -ne 0) {
        throw "curl failed ($exit) for $Uri : $metaLine"
    }
    $parts = "$metaLine".Trim() -split ':'
    if ($parts.Count -lt 3) {
        throw "curl meta parse failed for $Uri : $metaLine"
    }
    $cache = $null
    if ($headerPart -match 'X-Cache-Status:\s*(\S+)') { $cache = $Matches[1] }
    return [pscustomobject]@{
        Status  = [int]$parts[0]
        Seconds = [double]$parts[1]
        Bytes   = [int]$parts[2]
        Cache   = $cache
        Headers = $headerPart
        Body    = $responseBody
    }
}

Set-Location $Root
Write-Host "assert-stack: $BaseUrl (timeout ${TimeoutSec}s)"

$envOk = (Test-Path (Join-Path $Root '.env')) -and (Test-Path (Join-Path $Root 'backend')) -and (Test-Path (Join-Path $Root 'frontend'))
if (-not $envOk) {
    throw 'Missing .env, backend/, or frontend/. Copy .env.development -> .env and clone apps first.'
}
Write-Step 'prerequisites (.env, backend/, frontend/)'

$deadline = (Get-Date).AddSeconds($TimeoutSec)
$healthy = $false
do {
    $states = @{}
    foreach ($n in @('api', 'frontend', 'web-server', 'mysql')) {
        $states[$n] = (docker compose ps $n --format '{{.Name}} {{.Status}}' 2>&1 | Out-String).Trim()
    }
    $coreOk = ($states['mysql'] -match 'healthy') -and ($states['api'] -match 'healthy') -and ($states['frontend'] -match 'healthy') -and ($states['web-server'] -match 'Up')
    if ($coreOk) { $healthy = $true; break }
    Start-Sleep -Seconds 5
} while ((Get-Date) -lt $deadline)

if (-not $healthy) {
    docker compose ps 2>&1 | Out-Host
    docker compose logs api --tail 40 2>&1 | Out-Host
    throw 'Stack did not become healthy in time.'
}
Write-Step 'compose services healthy'

$countRaw = docker compose exec -T api php artisan tinker --execute="echo App\Models\ruleset\Ruleset::query()->count();" 2>&1 | Out-String
$countMatch = [regex]::Match($countRaw, '(?m)^(\d+)\s*$')
$rulesetCount = if ($countMatch.Success) { [int]$countMatch.Groups[1].Value } else { -1 }
if ($rulesetCount -lt 1) {
    throw "Expected >=1 ruleset after boot seed; got $rulesetCount"
}
Write-Step "ruleset seed (count=$rulesetCount)"

$spa = Invoke-Http -Uri "$BaseUrl/"
if ($spa.Status -ne 200) { throw "SPA expected 200, got $($spa.Status)" }
Write-Step "SPA via nginx ($($spa.Status))"

$csrf = Invoke-Http -Uri "$BaseUrl/sanctum/csrf-cookie"
if ($csrf.Status -ge 400) { throw "CSRF expected <400, got $($csrf.Status)" }
Write-Step "sanctum csrf ($($csrf.Status))"

$unauthCatalog = Invoke-Http -Uri "$BaseUrl/api/rulesets/current/character-creation-options" -Headers @{ Accept = 'application/json' }
if ($unauthCatalog.Status -ne 401) {
    throw "Unauth catalog expected 401, got $($unauthCatalog.Status)"
}
if (-not $unauthCatalog.Cache) {
    throw 'Expected X-Cache-Status on catalog response'
}
Write-Step "catalog unauth ($($unauthCatalog.Status), cache=$($unauthCatalog.Cache))"

$jar = Join-Path $env:TEMP ("assert-stack-{0}.jar" -f [guid]::NewGuid().ToString('N'))
Invoke-Http -Uri "$BaseUrl/sanctum/csrf-cookie" -CookieJar $jar | Out-Null
$xsrfLine = Get-Content $jar | Where-Object { $_ -match 'XSRF-TOKEN' } | Select-Object -Last 1
$xsrf = $null
if ($xsrfLine) {
    $xsrf = [uri]::UnescapeDataString(($xsrfLine -split '\s+')[-1])
}
$email = "smoke_$([guid]::NewGuid().ToString('N').Substring(0,10))@example.com"
$body = @{ name = 'Smoke'; email = $email; password = 'password'; password_confirmation = 'password' } | ConvertTo-Json -Compress
$reg = Invoke-Http -Method POST -Uri "$BaseUrl/api/register" -CookieJar $jar -Headers @{
    Accept           = 'application/json'
    'Content-Type'   = 'application/json'
    'X-XSRF-TOKEN'   = $xsrf
} -Body $body
if ($reg.Status -notin 200, 201) {
    $regBody = "$($reg.Body)"
    $snippet = if ($regBody.Length -gt 500) { $regBody.Substring(0, 500) } else { $regBody }
    throw "Register expected 200/201, got $($reg.Status): $snippet"
}
Write-Step "register ($($reg.Status))"

$cat1 = Invoke-Http -Uri "$BaseUrl/api/rulesets/current/character-creation-options" -CookieJar $jar -Headers @{ Accept = 'application/json' }
$cat2 = Invoke-Http -Uri "$BaseUrl/api/rulesets/current/character-creation-options" -CookieJar $jar -Headers @{ Accept = 'application/json' }
if ($cat1.Status -ne 200 -or $cat2.Status -ne 200) {
    throw "Auth catalog expected 200/200, got $($cat1.Status)/$($cat2.Status)"
}
if ($cat2.Cache -ne 'HIT') {
    throw "Expected second catalog X-Cache-Status=HIT, got $($cat2.Cache)"
}
Write-Step "catalog cache ($($cat1.Cache) then $($cat2.Cache))"

$viteEnv = (docker compose exec -T frontend printenv VITE_API_URL 2>&1 | Out-String).Trim()
$chokidar = (docker compose exec -T frontend printenv CHOKIDAR_USEPOLLING 2>&1 | Out-String).Trim()
if ($viteEnv -notmatch '127\.0\.0\.1|localhost') {
    throw "frontend VITE_API_URL unexpected: $viteEnv"
}
Write-Step "frontend env (VITE_API_URL=$viteEnv, CHOKIDAR_USEPOLLING=$chokidar)"

Write-Host 'ALL ASSERTIONS PASSED'
exit 0
