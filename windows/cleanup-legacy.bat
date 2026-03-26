@echo off
chcp 65001 >nul 2>&1
title PixFrameWorkspace - Altlasten bereinigen

echo.
echo ================================================
echo   PixFrameWorkspace - Altlasten bereinigen
echo   v1.0.x JSON-Dateien entfernen
echo ================================================
echo.

set "ROOT=%~dp0.."
set "BACKEND=%ROOT%\backend"

echo   Folgende Altlasten werden entfernt:
echo.
echo   1. backend\src\models\         (5 Dateien - ersetzt durch BaseRepository)
echo   2. backend\src\storage\        (fileStorage.js - ersetzt durch SQLite)
echo.

set /p CONFIRM="   Fortfahren? (J/N): "
if /I not "%CONFIRM%"=="J" (
    echo.
    echo   Abgebrochen.
    pause
    exit /b 0
)

echo.

:: models/ loeschen
if exist "%BACKEND%\src\models" (
    echo   Loesche src\models\ ...
    rmdir /s /q "%BACKEND%\src\models"
    echo   OK models/ entfernt
) else (
    echo   -- models/ bereits entfernt
)

:: storage/ loeschen
if exist "%BACKEND%\src\storage" (
    echo   Loesche src\storage\ ...
    rmdir /s /q "%BACKEND%\src\storage"
    echo   OK storage/ entfernt
) else (
    echo   -- storage/ bereits entfernt
)

echo.
echo ================================================
echo   Bereinigung abgeschlossen!
echo ================================================
echo.
pause
