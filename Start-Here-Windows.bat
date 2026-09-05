@echo off
setlocal
title Nur al-Dhikr local server
cd /d "%~dp0"
echo.
echo   Starting Nur al-Dhikr...
echo   Keep this window open while you use the app.
echo   (Closing it stops the app; your data lives in your browser.)
echo.
where py >nul 2>nul
if %errorlevel%==0 (
  start "Nur al-Dhikr server" /min cmd /c "py -m http.server 8080"
) else (
  start "Nur al-Dhikr server" /min cmd /c "python -m http.server 8080"
)
timeout /t 2 /nobreak >nul
start "" "http://localhost:8080/"
echo   The app should have opened in your browser.
echo   If it did not, open http://localhost:8080 manually.
echo.
pause
