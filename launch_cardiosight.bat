@echo off
setlocal enabledelayedexpansion

title CardioSight Launcher

echo ===============================================================================
echo                       CardioSight Platform Launcher
echo       Educational Cardiovascular ML Visualization ^& Anatomical Digital Twin
echo ===============================================================================
echo.

:: 1. Verify working directories exist
if not exist "%~dp0backend" (
    echo [ERROR] Directory 'backend\' not found in %~dp0.
    echo Please make sure this script is executed from the CardioSight project root.
    echo.
    pause
    exit /b 1
)

if not exist "%~dp0frontend" (
    echo [ERROR] Directory 'frontend\' not found in %~dp0.
    echo Please make sure this script is executed from the CardioSight project root.
    echo.
    pause
    exit /b 1
)

:: 2. Check Python availability
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python executable was not found in your PATH.
    echo Please install Python 3.10 or higher from https://www.python.org/
    echo and ensure 'Add Python to PATH' is selected during installation.
    echo.
    pause
    exit /b 1
)

:: 3. Check Node.js and npm availability
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js was not found in your PATH.
    echo Please install Node.js 18 or higher from https://nodejs.org/
    echo and ensure it is available in your system PATH.
    echo.
    pause
    exit /b 1
)

where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm was not found in your PATH.
    echo Please ensure npm is installed alongside Node.js.
    echo.
    pause
    exit /b 1
)

:: 4. Check if frontend dependencies (node_modules) are installed
if not exist "%~dp0frontend\node_modules" (
    echo [ERROR] 'frontend\node_modules' is missing!
    echo Frontend dependencies must be installed before starting Next.js.
    echo.
    echo To install dependencies, open a terminal and run:
    echo     cd "%~dp0frontend"
    echo     npm install
    echo.
    pause
    exit /b 1
)

:: 5. Select Python executable (prefer project virtualenv if valid)
set "PYTHON_EXE=python"
if exist "%~dp0.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
    echo [CONFIG] Using project virtual environment: .venv
) else if exist "%~dp0venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0venv\Scripts\python.exe"
    echo [CONFIG] Using project virtual environment: venv
) else if exist "%~dp0env\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0env\Scripts\python.exe"
    echo [CONFIG] Using project virtual environment: env
) else (
    echo [CONFIG] Using system Python executable
)

:: 6. Check for port conflicts gracefully
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo.
    echo [NOTICE] Port 8000 is already in use by an active process.
    echo If this is an existing CardioSight backend process, it will continue serving.
    echo Otherwise, please close the conflicting application on port 8000.
    echo.
)

netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo.
    echo [NOTICE] Port 3000 is already in use by an active process.
    echo If this is an existing CardioSight frontend dev server, it will continue serving.
    echo Otherwise, please close the conflicting application on port 3000.
    echo.
)

:: 7. Launch Backend in a persistent command window
echo [STARTING] Launching FastAPI backend on http://127.0.0.1:8000 ...
start "CardioSight - FastAPI Backend (Port 8000)" cmd /k "cd /d ""%~dp0"" && echo =================================================== && echo   CardioSight FastAPI Backend Service && echo   Health URL: http://127.0.0.1:8000/api/health && echo =================================================== && ""%PYTHON_EXE%"" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"

:: 8. Launch Frontend in a persistent command window
echo [STARTING] Launching Next.js frontend on http://localhost:3000 ...
start "CardioSight - Next.js Frontend (Port 3000)" cmd /k "cd /d ""%~dp0frontend"" && echo =================================================== && echo   CardioSight Next.js 16 Web Application && echo   App URL: http://localhost:3000 && echo =================================================== && npm run dev"

echo.
echo ===============================================================================
echo                CardioSight Services Launched Successfully!
echo ===============================================================================
echo.
echo   [API Backend]   http://127.0.0.1:8000/api/health
echo   [Web Frontend]  http://localhost:3000
echo.
echo   Both services are running in their own terminal windows so you can
echo   view real-time API logs, build notices, and request statistics.
echo.
echo   TO STOP THE APPLICATION:
echo     - Press Ctrl+C in each terminal window, or
echo     - Close both command prompt windows.
echo.
echo ===============================================================================
echo.
pause
