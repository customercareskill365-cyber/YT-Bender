@echo off
title Push YTBender to GitHub
cd /d "%~dp0"
echo ========================================================
echo   Pushing YTBender repository to GitHub...
echo ========================================================
echo.
"C:\Program Files\Git\cmd\git.exe" push -u origin main
echo.
echo ========================================================
echo   Done! Check your repository on GitHub.
echo ========================================================
pause
