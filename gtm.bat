@echo off
REM GTM Engine - Labeled Terminal Launcher
REM Double-click this file from your desktop to open a terminal
REM already set up for the GTM Engine project

title GTM Engine - Quantum Tools
color 0A
cd /d C:\Users\tomha\claude

cls
echo.
echo  =================================================================
echo   GTM INTELLIGENCE ENGINE - Quantum Tools
echo  =================================================================
echo.
echo   Working directory: %CD%
echo.
echo  COMMON COMMANDS:
echo  -----------------------------------------------------------------
echo.
echo   python main.py status              Show engine status
echo   python main.py brand               Reinit brand standards
echo   python main.py derivatives MA-001  Generate text derivatives
echo.
echo  REEL PRODUCTION (full pipeline):
echo   python -c "from gtm_engine.content_factory.master_asset import load_master_asset; from gtm_engine.content_factory.derivatives import generate_derivative; a=load_master_asset('MA-001'); d=generate_derivative(a,'reel_script',run_benchmark=False,generate_media=True); print(f'Finished: {d.get(\"media\",{}).get(\"finished_reel\",\"not complete\")}')"
echo.
echo  GIT:
echo   git pull                           Pull latest changes
echo   git status                         Check status
echo.
echo  FILES:
echo   dir content_queue\media\           List generated media
echo   explorer content_queue\media       Open media folder
echo.
echo  =================================================================
echo.

REM Verify ffmpeg is available
where ffmpeg >nul 2>&1
if %errorlevel% equ 0 (
    echo  [OK] ffmpeg detected
) else (
    echo  [!!] ffmpeg NOT found in PATH - video stitching will fail
)

REM Check .env exists
if exist .env (
    echo  [OK] .env file present
) else (
    echo  [!!] .env file missing
)

REM Check API key is set (without showing it)
findstr /B "ANTHROPIC_API_KEY=sk-ant" .env >nul 2>&1
if %errorlevel% equ 0 (
    echo  [OK] Anthropic API key configured
)
findstr /B "GOOGLE_API_KEY=" .env >nul 2>&1
if %errorlevel% equ 0 (
    echo  [OK] Google API key configured
)

echo.
echo  =================================================================
echo.
cmd /k
