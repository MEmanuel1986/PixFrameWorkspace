@echo off
chcp 65001 >nul 2>&1
title PixFrameWorkspace

echo.
echo ================================================
echo   PixFrameWorkspace - Start (Windows)
echo ================================================
echo.

set "ROOT=%~dp0.."
set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"

:: Prüfe node_modules
if not exist "%BACKEND%\node_modules" (
    echo !! Backend node_modules fehlt.
    echo    Bitte zuerst: windows\install.bat
    pause
    exit /b 1
)
if not exist "%FRONTEND%\node_modules" (
    echo !! Frontend node_modules fehlt.
    echo    Bitte zuerst: windows\install.bat
    pause
    exit /b 1
)

:: .env sicherstellen
if not exist "%BACKEND%\.env" (
    if exist "%BACKEND%\.env.example" (
        copy "%BACKEND%\.env.example" "%BACKEND%\.env" >nul
        echo OK .env erstellt
    )
)

:: Backend in neuem Fenster starten
echo ^>^> Starte Backend...
start "PixFrame Backend" cmd /k "cd /d "%BACKEND%" && node server.js"

:: 2 Sekunden warten
timeout /t 2 /nobreak >nul

:: Frontend in neuem Fenster starten
echo ^>^> Starte Frontend...
start "PixFrame Frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"

:: 3 Sekunden warten, dann Browser öffnen
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo ================================================
echo   Beide Server gestartet!
echo.
echo   Backend:   http://localhost:3001
echo   Frontend:  http://localhost:5173
echo ================================================
echo.
echo   Dieses Fenster kann geschlossen werden.
echo   Backend/Frontend laufen in eigenen Fenstern.
echo.
pause
