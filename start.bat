@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   DeepSeek Knowledge Base - Launcher
echo ========================================
echo.

:: Check Python
where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.10+ first.
    pause
    exit /b 1
)

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js 18+ first.
    pause
    exit /b 1
)

:: Get the script directory
set "ROOT=%~dp0"
set "SERVER_DIR=%ROOT%server"
set "WEB_DIR=%ROOT%server\web"

:: Check if dependencies are installed
if not exist "%SERVER_DIR%\.venv" (
    echo [INFO] First run detected. Installing Python dependencies...
    cd /d "%SERVER_DIR%"
    python -m venv .venv
    call .venv\Scripts\activate.bat
    pip install -r requirements.txt
    echo.
)

if not exist "%WEB_DIR%\node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd /d "%WEB_DIR%"
    call npm install
    echo.
)

echo [INFO] Starting services...
echo.

:: Start FastAPI backend in a new window
echo [1/2] Starting FastAPI backend on port 8000...
start "DeepSeek API" cmd /k "cd /d "%SERVER_DIR%" && call .venv\Scripts\activate.bat && python -m uvicorn main:app --reload --port 8000"

:: Wait a moment for backend to start
timeout /t 2 /nobreak >nul

:: Start Next.js frontend in a new window
echo [2/2] Starting Next.js frontend on port 3000...
start "DeepSeek Web" cmd /k "cd /d "%WEB_DIR%" && npm run dev"

echo.
echo ========================================
echo   Services are starting...
echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo   API Docs: http://localhost:8000/docs
echo.
echo   Close this window to stop monitoring.
echo   To stop services, close the opened windows.
echo ========================================
echo.

pause
