@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   DeepSeek Knowledge Base - Portable Build
echo ========================================
echo.

:: Get script directory
set "SERVER_DIR=%~dp0"
if "%SERVER_DIR:~-1%"=="\" set "SERVER_DIR=%SERVER_DIR:~0,-1%"
for %%i in ("%SERVER_DIR%") do set "ROOT=%%~dpi"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "VENV_DIR=%ROOT%\.venv"
set "DIST_DIR=%ROOT%\dist"
set "WEB_DIR=%SERVER_DIR%\web"

:: Check venv
if not exist "%VENV_DIR%\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found. Run setup.bat first.
    pause
    exit /b 1
)

echo [1/5] Building Next.js frontend...
cd /d "%WEB_DIR%"
call npm run build
if errorlevel 1 (
    echo [ERROR] Frontend build failed.
    pause
    exit /b 1
)

echo [2/5] Creating dist directory...
if exist "%DIST_DIR%" rmdir /s /q "%DIST_DIR%"
mkdir "%DIST_DIR%"
mkdir "%DIST_DIR%\server"
mkdir "%DIST_DIR%\server\web"
mkdir "%DIST_DIR%\server\data"

echo [3/5] Copying server files...
xcopy /s /e /q "%SERVER_DIR%\*.py" "%DIST_DIR%\server\"
xcopy /s /e /q "%SERVER_DIR%\api" "%DIST_DIR%\server\api\"
xcopy /s /e /q "%SERVER_DIR%\models" "%DIST_DIR%\server\models\"
xcopy /s /e /q "%SERVER_DIR%\services" "%DIST_DIR%\server\services\"
copy /y "%SERVER_DIR%\requirements.txt" "%DIST_DIR%\server\"
copy /y "%SERVER_DIR%\.env.example" "%DIST_DIR%\server\.env.example"

echo [4/5] Copying frontend build...
xcopy /s /e /q "%WEB_DIR%\.next" "%DIST_DIR%\server\web\.next\"
copy /y "%WEB_DIR%\package.json" "%DIST_DIR%\server\web\"
xcopy /s /e /q "%WEB_DIR%\public" "%DIST_DIR%\server\web\public\"

echo [5/5] Creating launcher scripts...

:: Main launcher
(
echo @echo off
echo setlocal enabledelayedexpansion
echo.
echo echo ========================================
echo echo   DeepSeek Knowledge Base - Portable
echo echo ========================================
echo echo.
echo.
echo set "ROOT=%%~dp0"
echo set "SERVER_DIR=%%ROOT%%server"
echo set "DATA_DIR=%%SERVER_DIR%%\data"
echo set "VENV_DIR=%%ROOT%%\.venv"
echo.
echo :: Check Python
echo where python ^>nul 2^>^&1
echo if errorlevel 1 ^(
echo     echo [ERROR] Python 3.10+ is required.
echo     echo Download from: https://www.python.org/downloads/
echo     pause
echo     exit /b 1
echo ^)
echo.
echo :: Create venv if not exists
echo if not exist "%%VENV_DIR%%\Scripts\activate.bat" ^(
echo     echo [INFO] First run: creating virtual environment...
echo     python -m venv "%%VENV_DIR%%"
echo     call "%%VENV_DIR%%\Scripts\activate.bat"
echo     pip install -r "%%SERVER_DIR%%\requirements.txt"
echo     echo.
echo     echo [INFO] Setup complete!
echo     echo.
echo     echo NOTE: The embedding model will be downloaded on first use.
echo     echo This requires internet connection and ~500MB disk space.
echo     echo The model is cached at: %%USERPROFILE%%\.cache\torch\sentence_transformers\
echo     echo.
echo ^)
echo.
echo :: Activate venv
echo call "%%VENV_DIR%%\Scripts\activate.bat"
echo.
echo :: Check .env
echo if not exist "%%SERVER_DIR%%\.env" ^(
echo     if exist "%%SERVER_DIR%%\.env.example" ^(
echo         echo [INFO] Creating .env from template...
echo         copy "%%SERVER_DIR%%\.env.example" "%%SERVER_DIR%%\.env"
echo         echo [ACTION] Please edit %%SERVER_DIR%%\.env and add your LLM_API_KEY
echo         pause
echo     ^)
echo ^)
echo.
echo :: Start backend
echo echo Starting backend on http://localhost:8000
echo echo API docs at http://localhost:8000/docs
echo echo.
echo echo Press Ctrl+C to stop.
echo echo.
echo cd /d "%%SERVER_DIR%%"
echo python -m uvicorn main:app --host 0.0.0.0 --port 8000
) > "%DIST_DIR%\start.bat"

:: README
(
echo # DeepSeek Knowledge Base - Portable Edition
echo.
echo ## Quick Start
echo.
echo 1. Make sure Python 3.10+ is installed
echo 2. Edit `server\.env` and add your `LLM_API_KEY`
echo 3. Run `start.bat`
echo 4. Open http://localhost:8000/docs for API docs
echo.
echo ## Embedding Model
echo.
echo The embedding model (bge-small-zh-v1.5, ~500MB^) is downloaded automatically on first use.
echo It is cached at: `%%USERPROFILE%%\.cache\torch\sentence_transformers\`
echo.
echo If you are offline, the system will fallback to hash-based embedding (lower quality^).
echo.
echo ## Data Storage
echo.
echo All data is stored in `server\data\`:
echo - `knowledge.db` - SQLite database
echo - `chroma\` - Vector store
echo.
echo ## Frontend
echo.
echo The frontend is pre-built. To access the full UI, build it separately:
echo.
echo ```bash
echo cd server\web
echo npm install
echo npm run build
echo npm start
echo ```
echo.
echo ## Configuration
echo.
echo Edit `server\.env`:
echo.
echo ```env
echo LLM_API_KEY=sk-your-key
echo LLM_BASE_URL=https://api.deepseek.com
echo LLM_MODEL=deepseek-chat
echo ```
) > "%DIST_DIR%\README.md"

:: .env.example
if exist "%SERVER_DIR%\.env.example" copy /y "%SERVER_DIR%\.env.example" "%DIST_DIR%\server\"

echo.
echo ========================================
echo   Build complete!
echo.
echo   Output: %DIST_DIR%
echo.
echo   To distribute:
echo     1. Zip the 'dist' folder
echo     2. User extracts and runs 'start.bat'
echo     3. First run auto-creates venv and installs deps
echo.
echo   Note: Embedding model (~500MB^) downloads on first use.
echo ========================================
echo.

pause
