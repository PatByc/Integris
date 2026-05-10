<#
.SYNOPSIS
    Stop all Integris dev services started by start_dev.ps1.
    Reads process IDs from .dev-pids and terminates them.
    In Windows Terminal mode this closes the entire dev terminal window.
    In fallback mode it closes each individual PowerShell window.
#>

$root    = Split-Path $PSScriptRoot -Parent
$pidFile = Join-Path $root ".dev-pids"

if (-not (Test-Path $pidFile)) {
    Write-Host ""
    Write-Host "No .dev-pids file found — services may not be running." -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

$savedPids = Get-Content $pidFile | Where-Object { $_ -match '^\d+$' }

if (-not $savedPids) {
    Write-Host "PID file is empty." -ForegroundColor Yellow
    Remove-Item $pidFile
    exit 0
}

Write-Host ""
Write-Host "Stopping Integris dev services..." -ForegroundColor Yellow
Write-Host ""

$stopped = 0
foreach ($id in $savedPids) {
    $proc = Get-Process -Id $id -ErrorAction SilentlyContinue
    if ($proc) {
        Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
        Write-Host "  Stopped  $($proc.Name)  (PID $id)" -ForegroundColor Cyan
        $stopped++
    } else {
        Write-Host "  PID $id already gone" -ForegroundColor DarkGray
    }
}

Remove-Item $pidFile

Write-Host ""
if ($stopped -gt 0) {
    Write-Host "All services stopped." -ForegroundColor Green
} else {
    Write-Host "No running processes found (already stopped?)." -ForegroundColor DarkGray
}
Write-Host ""
