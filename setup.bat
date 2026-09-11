@echo off
echo ========================================
echo ImBT Backend Setup Script
echo ========================================
echo.

echo Checking if Node.js is installed...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not found in PATH!
    echo.
    echo Please install Node.js from https://nodejs.org/
    echo Download the LTS version and run the installer.
    echo Make sure to check "Add to PATH" during installation.
    echo.
    echo After installing Node.js, run this script again.
    pause
    exit /b 1
)

echo Node.js is installed!
node --version
echo.

echo Checking if npm is available...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not found in PATH!
    echo Please reinstall Node.js and make sure npm is included.
    pause
    exit /b 1
)

echo npm is available!
npm --version
echo.

echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo Dependencies installed successfully!
echo.

echo Initializing database...
call npm run init-db
if %errorlevel% neq 0 (
    echo ERROR: Failed to initialize database!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo To start the server, run:
echo   npm run dev    (for development)
echo   npm start      (for production)
echo   start.bat      (to use the start script)
echo.
echo The application will be available at:
echo   http://localhost:3000
echo.
pause
