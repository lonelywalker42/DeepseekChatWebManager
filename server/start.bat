@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   DeepSeek Knowledge Base - Launcher
echo ========================================
echo.

:: Get script directory (server/) and root (parent)
set "SERVER_DIR=%~dp0"
:: Remove trailing backslash
if "%SERVER_DIR:~-1%"=="\" set "SERVER_DIR=%SERVER_DIR:~0,-1%"
for %%i in ("%SERVER_DIR%") do set "ROOT=%%~dpi"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "VENV_DIR=%ROOT%\.venv"
set "WEB_DIR=%SERVER_DIR%\web"

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

:: Check .venv exists
if not exist "%VENV_DIR%\Scripts\activate.bat" (
    echo [INFO] Virtual environment not found at: %VENV_DIR%
    echo [INFO] Creating venv and installing dependencies...
    cd /d "%ROOT%"
    python -m venv .venv
    call "%VENV_DIR%\Scripts\activate.bat"
    pip install -r "%SERVER_DIR%\requirements.txt"
    echo.
)

:: Install frontend deps if needed
if not exist "%WEB_DIR%\node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd /d "%WEB_DIR%"
    call npm install
    echo.
)

echo [INFO] Starting services...
echo.

:: Start FastAPI backend
echo [1/2] Starting FastAPI backend on port 8000...
start "DeepSeek API" cmd /k "cd /d "%SERVER_DIR%" && call "%VENV_DIR%\Scripts\activate.bat" && python -m uvicorn main:app --reload --port 8000"

:: Wait for backend
timeout /t 2 /nobreak >nul

:: Start Next.js frontend
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
echo   Close the opened windows to stop services.
echo ========================================
echo.

pause
