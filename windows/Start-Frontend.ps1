# PixFrameWorkspace - Start-Frontend.ps1
# Startet den Vite Dev-Server (Port 5173)
#
Get-ChildItem -Path $PSScriptRoot -Include '*.bat','*.ps1' -Recurse | Unblock-File -ErrorAction SilentlyContinue
try { Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force } catch {}

$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir     = Split-Path -Parent $ScriptDir
$FrontendDir = Join-Path $RootDir "frontend"

if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Host "!! node_modules fehlt - bitte zuerst win\Install.bat ausfuehren" -ForegroundColor Red
    Read-Host "Druecke Enter zum Beenden"
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  PixFrameWorkspace - Frontend" -ForegroundColor Cyan
Write-Host "  http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Stoppen: Strg+C" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $FrontendDir

$vite = Join-Path $FrontendDir "node_modules\.bin\vite.cmd"
if (Test-Path $vite) {
    & $vite
} else {
    npx vite
}
