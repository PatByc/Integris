<#
.SYNOPSIS
    Start all Integris dev services.
    Opens tabs in Windows Terminal if available, otherwise separate windows.
    Run from project root: .\scripts\dev.ps1
#>

$root    = Split-Path $PSScriptRoot -Parent
$pidFile = Join-Path $root ".dev-pids"

function Get-Encoded {
    param([string]$Command)
    $bytes = [System.Text.Encoding]::Unicode.GetBytes($Command)
    return [Convert]::ToBase64String($bytes)
}

$enc = @(
    (Get-Encoded "Set-Location '$root\backend'; .\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000"),
    (Get-Encoded "Set-Location '$root\frontend'; npm run dev"),
    (Get-Encoded "Set-Location '$root'; backend\.venv\Scripts\python -m workers.ocr_worker"),
    (Get-Encoded "Set-Location '$root'; backend\.venv\Scripts\python -m workers.extraction_worker"),
    (Get-Encoded "Set-Location '$root'; backend\.venv\Scripts\python -m workers.xml_generation_worker"),
    (Get-Encoded "Set-Location '$root'; backend\.venv\Scripts\python -m workers.ksef_submission_worker"),
    (Get-Encoded "Set-Location '$root'; backend\.venv\Scripts\python -m workers.ksef_upo_polling_worker")
)

$titles = @("Backend", "Frontend", "OCR Worker", "Extraction Worker", "XML Worker", "KSeF Worker", "UPO Polling Worker")

Write-Host ""
Write-Host "Starting Integris dev services..." -ForegroundColor Yellow
Write-Host ""

if (Get-Command wt -ErrorAction SilentlyContinue) {
    # Windows Terminal: open all 4 as tabs in one window
    $tabs = for ($i = 0; $i -lt 7; $i++) {
        "new-tab --title `"$($titles[$i])`" -- powershell -NoExit -EncodedCommand $($enc[$i])"
    }
    $wtArgs = $tabs -join " ; "
    $proc = Start-Process wt -ArgumentList $wtArgs -PassThru
    $proc.Id | Set-Content $pidFile
    Write-Host "  Opened 7 tabs in Windows Terminal (PID $($proc.Id))" -ForegroundColor Cyan
} else {
    # Fallback: separate PowerShell windows
    $pids = @()
    for ($i = 0; $i -lt 7; $i++) {
        $proc = Start-Process powershell -ArgumentList "-NoExit", "-EncodedCommand", $enc[$i] -PassThru
        $pids += $proc.Id
        Write-Host "  started  Integris: $($titles[$i])  (PID $($proc.Id))" -ForegroundColor Cyan
    }
    $pids | Set-Content $pidFile
}

Write-Host ""
Write-Host "All 7 services started." -ForegroundColor Green
Write-Host ""
Write-Host "  Backend   http://localhost:8000" -ForegroundColor DarkGray
Write-Host "  API docs  http://localhost:8000/docs" -ForegroundColor DarkGray
Write-Host "  Frontend  http://localhost:3000" -ForegroundColor DarkGray
Write-Host ""
