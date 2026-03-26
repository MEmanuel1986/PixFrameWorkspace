@echo off
chcp 65001 >nul 2>&1
title PixFrameWorkspace - Installation

echo.
echo ================================================
echo   PixFrameWorkspace - Installation (Windows)
echo ================================================
echo.

:: PowerShell-Script aufrufen
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"

if errorlevel 1 (
    echo.
    echo !! Installation fehlgeschlagen.
    echo    Bitte Fehlermeldungen oben beachten.
    echo.
)

pause
