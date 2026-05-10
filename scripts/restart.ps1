<#
.SYNOPSIS
    Restart all Integris dev services.
    Run from project root: .\scripts\restart.ps1
#>

$scripts = Split-Path $PSScriptRoot -Leaf | Out-Null; $scripts = $PSScriptRoot

Write-Host ""
Write-Host "Restarting Integris dev services..." -ForegroundColor Yellow

& "$scripts\stop.ps1"
Start-Sleep -Milliseconds 500
& "$scripts\start_dev.ps1"
