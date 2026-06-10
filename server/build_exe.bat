@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   DeepSeek Knowledge Base - EXE Builder
echo ========================================
echo.

:: Get script directory
set "SERVER_DIR=%~dp0"
if "%SERVER_DIR:~-1%"=="\" set "SERVER_DIR=%SERVER_DIR:~0,-1%"
for %%i in ("%SERVER_DIR%") do set "ROOT=%%~dpi"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "WEB_DIR=%SERVER_DIR%\web"
set "VENV_DIR=%ROOT%\.venv"

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

echo [1/6] Building Next.js static export...
cd /d "%WEB_DIR%"
call npm run build
if errorlevel 1 (
    echo [ERROR] Next.js build failed.
    pause
    exit /b 1
)

:: Verify output exists
if not exist "%WEB_DIR%\out\index.html" (
    echo [ERROR] Next.js static export not found at %WEB_DIR%\out\
    echo [ERROR] Make sure next.config.ts has output: "export"
    pause
    exit /b 1
)
echo     Static export complete: %WEB_DIR%\out\

echo [2/6] Activating virtual environment...
if not exist "%VENV_DIR%\Scripts\activate.bat" (
    echo [INFO] Creating venv...
    python -m venv "%VENV_DIR%"
)
call "%VENV_DIR%\Scripts\activate.bat"

echo [3/6] Installing EXE dependencies...
pip install -r "%SERVER_DIR%\requirements-exe.txt"
pip install pyinstaller

echo [4/6] Cleaning previous build...
cd /d "%SERVER_DIR%"
if exist "build" rmdir /s /q "build"
if exist "dist" rmdir /s /q "dist"

echo [5/6] Building EXE with PyInstaller...
pyinstaller build_exe.spec --clean --noconfirm
if errorlevel 1 (
    echo [ERROR] PyInstaller build failed.
    pause
    exit /b 1
)

echo [6/6] Copying data files...
:: Create .env.example next to exe
if exist "%SERVER_DIR%\.env.example" (
    copy /y "%SERVER_DIR%\.env.example" "%SERVER_DIR%\dist\.env.example"
)

echo.
echo ========================================
echo   Build complete!
echo.
echo   Output: %SERVER_DIR%\dist\DeepseekKnowledgeBase.exe
echo.
echo   To use:
echo     1. Copy the exe to any folder
echo     2. Create .env file with LLM_API_KEY (or use Web settings)
echo     3. Run the exe
echo     4. Open http://localhost:8000 in browser
echo.
echo   Data will be saved to: data\ (next to the exe)
echo ========================================
echo.

pause
