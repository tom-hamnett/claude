@echo off
REM Quick reel generation - run from anywhere
title GTM Engine - Reel Production
cd /d C:\Users\tomha\claude

echo.
echo Generating reel from MA-001...
echo This takes 3-5 minutes: TTS + 2 talking head clips + 1 B-roll + stitch + overlay
echo.

python -c "from gtm_engine.content_factory.master_asset import load_master_asset; from gtm_engine.content_factory.derivatives import generate_derivative; a=load_master_asset('MA-001'); d=generate_derivative(a,'reel_script',run_benchmark=False,generate_media=True); print(''); print(f'Finished reel: {d.get(\"media\",{}).get(\"finished_reel\",\"not complete\")}')"

echo.
echo Opening media folder...
start explorer content_queue\media
pause
