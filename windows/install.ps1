# PixFrameWorkspace - install.ps1 (v1.1.0)
# Installiert alle Abhaengigkeiten fuer Backend und Frontend.

$ErrorActionPreference = "Continue"

function Write-Step  ($msg) { Write-Host ">> $msg" -ForegroundColor Cyan }
function Write-Ok    ($msg) { Write-Host "OK $msg" -ForegroundColor Green }
function Write-Warn  ($msg) { Write-Host "!! $msg" -ForegroundColor Yellow }
function Write-Fail  ($msg) { Write-Host "XX $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  PixFrameWorkspace - Setup (Windows)"            -ForegroundColor Cyan
Write-Host "  Fotografie und Videografie Verwaltung"           -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# -- Pfade --
$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir     = Split-Path -Parent $ScriptDir
$BackendDir  = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "frontend"

# -- Voraussetzungen --
Write-Step "Pruefe Voraussetzungen..."

try {
    $nodeVersion = (node --version 2>&1).ToString().TrimStart('v')
    $nodeMajor   = [int]($nodeVersion.Split('.')[0])
    if ($nodeMajor -lt 18) {
        Write-Fail "Node.js v$nodeVersion ist zu alt. Mindestens v18 erforderlich."
    }
    Write-Ok "Node.js: v$nodeVersion"
} catch {
    Write-Fail "Node.js nicht gefunden. Bitte installieren: https://nodejs.org"
}

try {
    $npmVersion = (npm --version 2>&1).ToString()
    Write-Ok "npm: v$npmVersion"
} catch {
    Write-Fail "npm nicht gefunden."
}

if ($nodeMajor -ge 24) {
    Write-Host ""
    Write-Warn "Node.js v$nodeVersion ist sehr neu."
    Write-Warn "better-sqlite3 hat moeglicherweise noch keine Prebuilds fuer v$nodeMajor."
    Write-Warn "Empfehlung: Node.js LTS (v22) verwenden - https://nodejs.org"
    Write-Host ""
}

# -- Backend .env --
Write-Step "Pruefe Backend-Konfiguration..."
$envFile    = Join-Path $BackendDir ".env"
$envExample = Join-Path $BackendDir ".env.example"
if (Test-Path $envFile) {
    Write-Ok ".env bereits vorhanden"
} elseif (Test-Path $envExample) {
    Copy-Item $envExample $envFile
    Write-Ok ".env aus .env.example erstellt"
} else {
    Write-Warn ".env fehlt - bitte manuell anlegen"
}

# -- Backend installieren --
Write-Host ""
Write-Step "Installiere Backend-Abhaengigkeiten..."
Write-Host "   (better-sqlite3 kompiliert native Bindings, kann 1-2 Min dauern)" -ForegroundColor Gray
Write-Host ""

Push-Location $BackendDir

$npmOutput = & npm install 2>&1
$npmExit   = $LASTEXITCODE

foreach ($line in $npmOutput) {
    Write-Host "   $line"
}

Pop-Location

if ($npmExit -ne 0) {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Red
    Write-Host "  Backend npm install fehlgeschlagen!" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Das liegt wahrscheinlich an better-sqlite3." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Loesung 1 (empfohlen):" -ForegroundColor White
    Write-Host "    Node.js LTS (v22) installieren" -ForegroundColor Gray
    Write-Host "    https://nodejs.org - LTS Version waehlen" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Loesung 2 (bei Node v$nodeMajor bleiben):" -ForegroundColor White
    Write-Host "    Visual Studio Build Tools installieren:" -ForegroundColor Gray
    Write-Host "    https://visualstudio.microsoft.com/visual-cpp-build-tools/" -ForegroundColor Gray
    Write-Host "    Workload: Desktopentwicklung mit C++" -ForegroundColor Gray
    Write-Host "    Dann erneut: windows\install.bat" -ForegroundColor Gray
    Write-Host "================================================" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Ok "Backend: npm install abgeschlossen"

# -- better-sqlite3 verifizieren --
Write-Host ""
Write-Step "Pruefe better-sqlite3..."

Push-Location $BackendDir
$nodeScript = "try{require('better-sqlite3');console.log('OK')}catch(e){console.error(e.message);process.exit(1)}"
$testOutput = & node -e $nodeScript 2>&1
$testExit   = $LASTEXITCODE
Pop-Location

if ($testExit -eq 0) {
    Write-Ok "better-sqlite3 funktionsfaehig"
} else {
    Write-Host ""
    Write-Warn "better-sqlite3 installiert aber nicht ladbar:"
    foreach ($line in $testOutput) {
        Write-Warn "  $line"
    }
    Write-Host ""
    Write-Warn "Versuche Rebuild..."

    Push-Location $BackendDir
    $rebuildOutput = & npm rebuild better-sqlite3 2>&1
    foreach ($line in $rebuildOutput) {
        Write-Host "   $line"
    }
    Pop-Location

    # Nochmal testen
    Push-Location $BackendDir
    $testOutput2 = & node -e $nodeScript 2>&1
    $testExit2   = $LASTEXITCODE
    Pop-Location

    if ($testExit2 -eq 0) {
        Write-Ok "better-sqlite3 nach Rebuild funktionsfaehig"
    } else {
        Write-Warn "better-sqlite3 funktioniert nicht. Siehe Fehler oben."
        Write-Warn "Backend wird beim Start fehlschlagen."
    }
}

# -- Frontend installieren --
Write-Host ""
Write-Step "Installiere Frontend-Abhaengigkeiten..."

Push-Location $FrontendDir
$frontOutput = & npm install 2>&1
$frontExit   = $LASTEXITCODE
foreach ($line in $frontOutput) {
    Write-Host "   $line"
}
Pop-Location

if ($frontExit -eq 0) {
    Write-Ok "Frontend: npm install abgeschlossen"
} else {
    Write-Warn "Frontend: npm install hatte Probleme (Exit: $frontExit)"
}

# -- Fertig --
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Installation abgeschlossen!" -ForegroundColor Green
Write-Host ""
Write-Host "  Starten:" -ForegroundColor Yellow
Write-Host "    windows\start-all.bat" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Oder einzeln:" -ForegroundColor Yellow
Write-Host "    windows\start-backend.bat" -ForegroundColor Yellow
Write-Host "    windows\start-frontend.bat" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
