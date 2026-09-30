#Requires -Version 5.1
<#
.SYNOPSIS
  Create missing .env files for infra, frontend, and backend from templates.

.DESCRIPTION
  Never overwrites an existing .env. Infra prefers .env.development, then
  .env.example. App repos use their own .env.example when present.
#>
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

function Ensure-EnvFile {
    param(
        [Parameter(Mandatory = $true)][string]$Target,
        [Parameter(Mandatory = $true)][string[]]$Sources,
        [Parameter(Mandatory = $true)][string]$Label
    )

    if (Test-Path $Target) {
        Write-Host "OK  $Label already exists: $Target"
        return
    }

    foreach ($src in $Sources) {
        if (Test-Path $src) {
            $dir = Split-Path -Parent $Target
            if ($dir -and -not (Test-Path $dir)) {
                throw "Cannot create $Label .env: directory missing ($dir). Clone the app first."
            }
            Copy-Item -Path $src -Destination $Target
            Write-Host "OK  $Label created: $Target <- $src"
            return
        }
    }

    $listed = $Sources -join ', '
    throw "Cannot create $Label .env: none of the templates exist ($listed)."
}

Ensure-EnvFile -Label 'infra' -Target (Join-Path $Root '.env') -Sources @(
    (Join-Path $Root '.env.development'),
    (Join-Path $Root '.env.example')
)

Ensure-EnvFile -Label 'frontend' -Target (Join-Path $Root 'frontend\.env') -Sources @(
    (Join-Path $Root 'frontend\.env.example')
)

Ensure-EnvFile -Label 'backend' -Target (Join-Path $Root 'backend\.env') -Sources @(
    (Join-Path $Root 'backend\.env.example')
)

Write-Host 'ensure-env: done'
