@echo off
echo ========================================
echo Stopping ImBT Backend Server
echo ========================================

echo.
echo Stopping all Node.js processes...
taskkill /f /im node.exe 2>nul
if %errorlevel% equ 0 (
    echo ✅ All Node.js processes stopped successfully
) else (
    echo ℹ️ No Node.js processes were running
)

echo.
echo Stopping any processes on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    taskkill /f /pid %%a 2>nul
    if !errorlevel! equ 0 (
        echo ✅ Process on port 3000 stopped (PID: %%a)
    )
)

echo.
echo Checking for any remaining processes...
netstat -aon | findstr :3000
if %errorlevel% equ 0 (
    echo ⚠️ Some processes may still be running on port 3000
) else (
    echo ✅ Port 3000 is now free
)

echo.
echo ========================================
echo Server shutdown complete!
echo ========================================
pause
