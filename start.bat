@echo off
setlocal enabledelayedexpansion
title e-chemEd Launcher

set "PROJ_DIR=%~dp0"
if "%PROJ_DIR:~-1%"=="\" set "PROJ_DIR=%PROJ_DIR:~0,-1%"
cd /d "%PROJ_DIR%"

echo ======================================================================
echo             Starting e-chemEd Engineering Chemistry Platform
echo ======================================================================
echo.

:: 1. Check Node.js installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in system PATH.
    echo Node.js 18 or higher is required to run e-chemEd.
    echo Opening https://nodejs.org in your browser...
    start https://nodejs.org
    echo.
    echo Please install Node.js - LTS version recommended - then run start.bat again.
    pause
    exit /b 1
)

:: 2. Verify Node.js version >= 18
for /f "tokens=1" %%v in ('node -e "const v = parseInt(process.versions.node.split('.')[0], 10); if (v < 18) { console.log('OUTDATED'); } else { console.log('OK'); }"') do set NODE_STATUS=%%v

if "%NODE_STATUS%"=="OUTDATED" (
    echo [ERROR] Your Node.js version is older than version 18.
    echo Node.js 18 or higher is required.
    echo Opening https://nodejs.org in your browser...
    start https://nodejs.org
    echo.
    echo Please upgrade Node.js - LTS version recommended - then run start.bat again.
    pause
    exit /b 1
)

:: 3. Check and install backend dependencies if missing
if not exist "%PROJ_DIR%\backend\node_modules\" (
    echo [SETUP] Installing backend dependencies for first-time setup...
    echo This may take a few moments...
    cd /d "%PROJ_DIR%\backend"
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo ======================================================================
        echo [ERROR] npm install failed in backend directory!
        echo Please ensure you are running a supported Node.js LTS release.
        echo Node 20 or Node 22 is recommended, along with C++ build tools if needed.
        echo ======================================================================
        cd /d "%PROJ_DIR%"
        pause
        exit /b 1
    )
    cd /d "%PROJ_DIR%"
    echo [SETUP] Backend dependencies installed successfully.
)

:: 4. Initialize backend/.env if missing
node "%PROJ_DIR%\scripts\init-env.js"

:: 5. Verify ports 3000 and 3001 are available
node "%PROJ_DIR%\scripts\check-ports.js"
if %errorlevel% neq 0 (
    pause
    exit /b 1
)

:: 6. Launch Backend and Frontend in separate titled windows
start "e-chemEd backend" cmd /k "title e-chemEd backend && cd /d "%PROJ_DIR%\backend" && node server.js"
start "e-chemEd frontend" cmd /k "title e-chemEd frontend && cd /d "%PROJ_DIR%" && node scripts\serve-frontend.js"

:: 7. Wait for backend health, record PIDs into .pids, and auto-open browser
node "%PROJ_DIR%\scripts\wait-and-launch.js"

:: 8. Print Local and Wi-Fi LAN access URLs
node "%PROJ_DIR%\scripts\print-lan.js"

echo ======================================================================
echo Press any key to stop both e-chemEd servers and close this launcher...
echo ======================================================================
pause >nul

:: Clean shutdown of servers on exit
call "%PROJ_DIR%\stop.bat"
