@echo off
setlocal

echo ========================================
echo   DeepSeek Knowledge Base - Setup
echo ========================================
echo.

:: Get script directory
set "SERVER_DIR=%~dp0"
if "%SERVER_DIR:~-1%"=="\" set "SERVER_DIR=%SERVER_DIR:~0,-1%"
for %%i in ("%SERVER_DIR%") do set "ROOT=%%~dpi"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "VENV_DIR=%ROOT%\.venv"

:: Check Python version
python --version 2>&1 | findstr /R "3\.[0-9]" >nul
if errorlevel 1 (
    echo [ERROR] Python 3.10+ required.
    pause
    exit /b 1
)

echo [1/4] Creating virtual environment...
if not exist "%VENV_DIR%\Scripts\activate.bat" (
    python -m venv "%VENV_DIR%"
    echo     Created at: %VENV_DIR%
) else (
    echo     Already exists, skipping.
)

echo [2/4] Activating venv and installing dependencies...
call "%VENV_DIR%\Scripts\activate.bat"
pip install --upgrade pip
pip install -r "%SERVER_DIR%\requirements.txt"

echo [3/4] Downloading embedding model (first run only)...
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-small-zh-v1.5')" 2>nul
if errorlevel 1 (
    echo     [WARN] Model download failed. Will fallback to hash-based embedding.
)

echo [4/4] Creating data directories...
if not exist "%SERVER_DIR%\data" mkdir "%SERVER_DIR%\data"

echo.
echo ========================================
echo   Setup complete!
echo.
echo   To start the server:
echo     start.bat
echo.
echo   Or manually:
echo     cd %ROOT%
echo     .venv\Scripts\activate
echo     cd server
echo     python -m uvicorn main:app --reload --port 8000
echo ========================================
echo.

pause
