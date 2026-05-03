@echo off
echo [Saden WA] 🛑 Stopping All Services...

echo Closing Backend (Port 4000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4000') do taskkill /f /pid %%a 2>nul

echo Closing Frontend (Port 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a 2>nul

echo [Saden WA] ✅ All services stopped.
pause
