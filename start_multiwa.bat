@echo off
title Multiwa SAAS - Professional Starter
cls
echo ===================================================
echo   🚀 MULTIWA SAAS - AUTOMATED STARTUP SYSTEM
echo ===================================================
echo.

:: Step 1: Cleaning up old processes
echo 🧹 Forcing cleanup of ports 3000 and 4000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r ":4000 *LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r ":3000 *LISTENING"') do taskkill /f /pid %%a >nul 2>&1
:: Backup: kill any node process if still stuck (optional/aggressive)
:: taskkill /f /im node.exe >nul 2>&1 
echo ✅ Ports are now clean.

:: Step 2: Starting Backend
echo.
echo 🚀 Starting Multiwa Backend Engine...
cd backend
start "Multiwa-Backend" cmd /k "npm run dev"
cd ..

:: Step 3: Starting Frontend
echo.
echo 🖥️ Starting Multiwa Dashboard Frontend...
cd frontend
start "Multiwa-Frontend" cmd /k "npm run dev"
cd ..

:: Step 4: Wait and Open Browser
echo.
echo ⏳ Waiting for engines to synchronize (10 seconds)...
timeout /t 10 /nobreak > nul

echo 🌐 Launching Dashboard at http://localhost:3000...
start http://localhost:3000/login

echo.
echo ===================================================
echo ✅ ALL SYSTEMS ARE ONLINE!
echo 💡 Keep the other command windows open for the SAAS to work.
echo ===================================================
echo.
pause
