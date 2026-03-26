@echo off
chcp 65001 >nul 2>&1
title PixFrame Backend

set "ROOT=%~dp0.."
set "BACKEND=%ROOT%\backend"

if not exist "%BACKEND%\node_modules" (
    echo !! node_modules fehlt - bitte zuerst windows\install.bat
    pause
    exit /b 1
)

if not exist "%BACKEND%\.env" (
    if exist "%BACKEND%\.env.example" (
        copy "%BACKEND%\.env.example" "%BACKEND%\.env" >nul
    )
)

cd /d "%BACKEND%"

:loop
echo.
echo ================================================
echo   PixFrameWorkspace - Backend
echo   http://localhost:3001
echo   Stoppen: Ctrl+C
echo ================================================
echo.

node server.js
set EXIT_CODE=%ERRORLEVEL%

if %EXIT_CODE% equ 2 goto :end

echo.
echo ^>^> Neustart in 2 Sekunden (Exit: %EXIT_CODE%)...
timeout /t 2 /nobreak >nul
goto :loop

:end
echo Backend beendet.
pause
