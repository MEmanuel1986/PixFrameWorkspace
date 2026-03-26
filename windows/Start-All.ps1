# PixFrameWorkspace - Start-All.ps1
# Startet Backend und Frontend in separaten PowerShell-Fenstern.
# KEIN automatisches npm install — bitte zuerst Install.bat ausfuehren.
#
Get-ChildItem -Path $PSScriptRoot -Include '*.bat','*.ps1' -Recurse | Unblock-File -ErrorAction SilentlyContinue
try { Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force } catch {}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir   = Split-Path -Parent $ScriptDir

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  PixFrameWorkspace - Start" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# node_modules pruefen — NICHT automatisch installieren, nur warnen
$backendMods  = Join-Path $RootDir "backend\node_modules"
$frontendMods = Join-Path $RootDir "frontend\node_modules"

$missingMods = $false
if (-not (Test-Path $backendMods)) {
    Write-Host "!! Backend node_modules fehlt." -ForegroundColor Red
    $missingMods = $true
}
if (-not (Test-Path $frontendMods)) {
    Write-Host "!! Frontend node_modules fehlt." -ForegroundColor Red
    $missingMods = $true
}

if ($missingMods) {
    Write-Host ""
    Write-Host "   Bitte zuerst die Installation ausfuehren:" -ForegroundColor Yellow
    Write-Host "   win\Install.bat" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Druecke Enter zum Beenden"
    exit 1
}

# Backend starten
Write-Host ">> Starte Backend in neuem Fenster..." -ForegroundColor Cyan
$backendScript = Join-Path $ScriptDir "Start-Backend.ps1"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $backendScript

Start-Sleep -Seconds 2

# Frontend starten
Write-Host ">> Starte Frontend in neuem Fenster..." -ForegroundColor Cyan
$frontendScript = Join-Path $ScriptDir "Start-Frontend.ps1"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $frontendScript

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Beide Server gestartet!" -ForegroundColor Green
Write-Host ""
Write-Host "  Backend:   http://localhost:3001" -ForegroundColor Yellow
Write-Host "  Frontend:  http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Browser oeffnet in 3 Sekunden..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Green

Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"
