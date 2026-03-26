@echo off
chcp 65001 >nul 2>&1
title PixFrame Frontend

set "ROOT=%~dp0.."
set "FRONTEND=%ROOT%\frontend"

if not exist "%FRONTEND%\node_modules" (
    echo !! node_modules fehlt - bitte zuerst windows\install.bat
    pause
    exit /b 1
)

cd /d "%FRONTEND%"

echo.
echo ================================================
echo   PixFrameWorkspace - Frontend
echo   http://localhost:5173
echo   Stoppen: Ctrl+C
echo ================================================
echo.

npm run dev
pause
