@echo off
echo ========================================
echo Starting ImBT Backend Server
echo ========================================
echo.

echo Checking if Node.js is installed...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please run setup.bat first to install Node.js.
    pause
    exit /b 1
)

echo Checking if dependencies are installed...
if not exist "node_modules" (
    echo Dependencies not found. Installing...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies!
        pause
        exit /b 1
    )
)

echo Checking if database exists...
if not exist "database\imbt.db" (
    echo Database not found. Initializing...
    npm run init-db
    if %errorlevel% neq 0 (
        echo ERROR: Failed to initialize database!
        pause
        exit /b 1
    )
)

echo.
echo Starting server in development mode...
echo Press Ctrl+C to stop the server
echo.
echo The application will be available at:
echo   http://localhost:3000
echo.

npm run dev
