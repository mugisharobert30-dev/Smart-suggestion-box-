@echo off
cd /d "%~dp0"
title Smart Suggestion Box

if not exist "node_modules" (
    echo Installing dependencies, please wait...
    call npm install
    if errorlevel 1 (
        echo.
        echo Failed to install dependencies. Make sure Node.js is installed.
        pause
        exit /b 1
    )
)

echo Starting Smart Suggestion Box...
echo The app will open in your browser automatically.
echo Keep this window open while using the app. Press Ctrl+C to stop.
echo.

call npm run dev -- --open
pause
