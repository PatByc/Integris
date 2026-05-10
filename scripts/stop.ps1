<#
.SYNOPSIS
    Stop all Integris dev services started by dev.ps1.
    Run from project root: .\scripts\stop.ps1
#>

$pidFile = Join-Path (Split-Path $PSScriptRoot -Parent) ".dev-pids"

if (-not (Test-Path $pidFile)) {
    Write-Host "No running services found (.dev-pids missing)." -ForegroundColor Yellow
    exit 0
}

$savedPids = Get-Content $pidFile | Where-Object { $_ -match '^\d+$' }

foreach ($id in $savedPids) {
    try {
        Stop-Process -Id $id -Force -ErrorAction Stop
        Write-Host "  stopped  PID $id" -ForegroundColor Cyan
    } catch {
        Write-Host "  skipped  PID $id (already gone)" -ForegroundColor DarkGray
    }
}

Remove-Item $pidFile -Force
Write-Host ""
Write-Host "All services stopped." -ForegroundColor Green
Write-Host ""
