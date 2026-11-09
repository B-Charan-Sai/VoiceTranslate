@echo off
title VoxTranslate AI Server
cd /d "%~dp0voice Translation\voice Translation"
call "..\.venv\Scripts\activate.bat"
echo ============================================================
echo   VoxTranslate AI - Real-Time Voice Translation Server
echo ============================================================
echo.
echo Local Access:   http://localhost:5000
echo Network Access: Run 'ipconfig' to find your Wi-Fi IPv4 address
echo.
echo NOTE for Mobile Testing:
echo Mobile browsers block microphones on unencrypted HTTP.
echo See DEPLOYMENT.md for free 1-click cloud deployment with HTTPS.
echo.
python app.py
pause
