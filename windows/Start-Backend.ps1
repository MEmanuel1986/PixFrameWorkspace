# PixFrameWorkspace - Start-Backend.ps1
# Startet den Express-Backend-Server (Port 3001).
# Restart-Loop: Bei Exit-Code 0 (Update) oder 1 (Absturz) automatisch neu starten.
#
Get-ChildItem -Path $PSScriptRoot -Include '*.bat','*.ps1' -Recurse | Unblock-File -ErrorAction SilentlyContinue
try { Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force } catch {}

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir    = Split-Path -Parent $ScriptDir
$BackendDir = Join-Path $RootDir "backend"

if (-not (Test-Path (Join-Path $BackendDir "node_modules"))) {
    Write-Host "!! node_modules fehlt - bitte zuerst win\Install.bat ausfuehren" -ForegroundColor Red
    Read-Host "Druecke Enter zum Beenden"
    exit 1
}

$EnvFile    = Join-Path $BackendDir ".env"
$EnvExample = Join-Path $BackendDir ".env.example"
if (-not (Test-Path $EnvFile)) {
    if (Test-Path $EnvExample) {
        Copy-Item $EnvExample $EnvFile
        Write-Host "OK .env aus .env.example erstellt" -ForegroundColor Green
    }
}

Set-Location $BackendDir
$nodemon = Join-Path $BackendDir "node_modules\.bin\nodemon.cmd"

while ($true) {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  PixFrameWorkspace - Backend" -ForegroundColor Cyan
    Write-Host "  http://localhost:3001" -ForegroundColor Cyan
    Write-Host "  Stoppen: Strg+C" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""

    if (Test-Path $nodemon) {
        & $nodemon server.js --exitcrash
    } else {
        node server.js
    }

    $exitCode = $LASTEXITCODE
    if ($exitCode -eq 2) { Write-Host "Backend beendet." -ForegroundColor Yellow; break }
    Write-Host ">> Neustart in 2 Sekunden (Exit: $exitCode)..." -ForegroundColor Cyan
    Start-Sleep -Seconds 2
}
