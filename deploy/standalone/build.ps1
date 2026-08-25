# Standalone build: produkční bundle pro publikování v rootu statického hostingu
# (bez nginx proxy). Adresa backendu se zapéká do bundle přes VITE_API_URL.
#
# Použití (z kořene repozitáře):
#   .\deploy\standalone\build.ps1 -BackendUrl https://ncrm-backend.example.com
#
# Volitelně lze předat i další VITE_* proměnné přes prostředí, např.:
#   $env:VITE_AUTH_MODE = 'keycloak'; .\deploy\standalone\build.ps1 -BackendUrl https://ncrm-backend.example.com
#
# Výstup: adresář dist\ — jeho obsah nahrajte do rootu hostingu.
param(
    [Parameter(Mandatory = $true)]
    [string]$BackendUrl
)

$ErrorActionPreference = 'Stop'

Set-Location (Join-Path $PSScriptRoot '..\..')

$env:VITE_API_URL = $BackendUrl

npm ci
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ''
Write-Host 'Hotovo. Obsah adresáře dist\ nahrajte do rootu hostingu.'
Write-Host "Backend: $BackendUrl (nezapomeňte na CORS pro doménu frontendu)."
